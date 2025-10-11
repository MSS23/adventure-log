'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Lock,
  Users,
  Calendar,
  MapPin,
  Camera,
  Loader2,
  AlertCircle,
  Eye,
  Edit,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import { getShareByToken } from '@/app/actions/album-sharing';
import type { Album, Photo, AlbumShare, SharePermissionLevel } from '@/types/database';
import { log } from '@/lib/utils/logger';
import { LikeButton } from '@/components/social/LikeButton';
import { getPhotoUrl } from '@/lib/utils/photo-url';

export default function SharedAlbumPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [share, setShare] = useState<AlbumShare | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSharedAlbum();
  }, [params.token]);

  const loadSharedAlbum = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get share by token
      const shareResult = await getShareByToken(params.token as string);

      if (!shareResult.success || !shareResult.data) {
        throw new Error(shareResult.error || 'Share not found');
      }

      const shareData = shareResult.data as AlbumShare & {
        album?: Album;
        shared_by?: { username: string; display_name?: string; avatar_url?: string };
      };

      setShare(shareData);
      setAlbum(shareData.album || null);

      // Fetch photos
      if (shareData.album?.id) {
        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('album_id', shareData.album.id)
          .order('order_index', { ascending: true });

        if (photosError) {
          log.error('Failed to fetch photos', {
            component: 'SharedAlbumPage',
            albumId: shareData.album.id,
          }, photosError);
        } else {
          setPhotos(photosData || []);
        }
      }
    } catch (err) {
      log.error('Failed to load shared album', {
        component: 'SharedAlbumPage',
        token: params.token,
      }, err as Error);
      setError(err instanceof Error ? err.message : 'Failed to load shared album');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (level?: SharePermissionLevel) => {
    switch (level) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'contribute':
        return <Plus className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getPermissionLabel = (level?: SharePermissionLevel) => {
    switch (level) {
      case 'view':
        return 'View Only';
      case 'contribute':
        return 'Can Contribute';
      case 'edit':
        return 'Can Edit';
      default:
        return 'View Only';
    }
  };

  const canContribute = share?.permission_level === 'contribute' || share?.permission_level === 'edit';
  const canEdit = share?.permission_level === 'edit';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading shared album...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !share || !album) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-red-900">Cannot Access Album</h3>
                <p className="text-red-700 mt-2">
                  {error || 'This share link may have expired or been revoked.'}
                </p>
              </div>
              <Link href="/albums">
                <Button variant="outline" className="mt-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Albums
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/albums">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Badge variant="secondary" className="flex items-center gap-1">
              {getPermissionIcon(share.permission_level)}
              {getPermissionLabel(share.permission_level)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Album Info */}
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {/* Shared by notice */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
                <span>
                  Shared by{' '}
                  <span className="font-medium text-blue-900">
                    {share.shared_by?.display_name || share.shared_by?.username || 'Someone'}
                  </span>
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {album.title}
                </h1>
                {album.description && (
                  <p className="text-gray-700 text-lg">{album.description}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {album.location_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{album.location_name}</span>
                  </div>
                )}

                {(album.date_start || album.date_end) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {album.date_start && new Date(album.date_start).toLocaleDateString()}
                      {album.date_end && album.date_start !== album.date_end &&
                        ` - ${new Date(album.date_end).toLocaleDateString()}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <LikeButton albumId={album.id} />

                {canContribute && (
                  <Link href={`/albums/${album.id}/upload`}>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                  </Link>
                )}

                {canEdit && (
                  <Link href={`/albums/${album.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Album
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <PhotoGrid
            photos={photos}
            albumId={album.id}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">This album doesn&apos;t have any photos yet.</p>
              {canContribute && (
                <Link href={`/albums/${album.id}/upload`}>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
