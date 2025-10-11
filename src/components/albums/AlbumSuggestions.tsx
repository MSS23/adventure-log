'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, Calendar, MapPin, Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { getPhotoUrl } from '@/lib/utils/photo-url';
import { generateAlbumSuggestions, filterExistingAlbums, type AlbumSuggestion } from '@/lib/ai/album-suggestions';
import type { Photo } from '@/types/database';
import { log } from '@/lib/utils/logger';
import { Toast } from '@capacitor/toast';

export function AlbumSuggestions() {
  const { user } = useAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<AlbumSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      // Fetch all user photos
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user!.id)
        .not('taken_at', 'is', null);

      if (photosError) throw photosError;

      // Fetch existing album photo IDs to filter out
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('id')
        .eq('user_id', user!.id)
        .not('album_id', 'is', null);

      const existingPhotoIds = new Set(existingPhotos?.map(p => p.id) || []);

      // Generate suggestions
      const allSuggestions = generateAlbumSuggestions(photos || []);
      const filteredSuggestions = filterExistingAlbums(allSuggestions, existingPhotoIds);

      // Take top 5 suggestions
      setSuggestions(filteredSuggestions.slice(0, 5));
    } catch (error) {
      log.error('Failed to generate album suggestions', { component: 'AlbumSuggestions' }, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const createAlbumFromSuggestion = async (suggestion: AlbumSuggestion) => {
    setCreating(suggestion.id);

    try {
      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user!.id,
          title: suggestion.suggested_title,
          description: suggestion.suggested_description,
          date_start: suggestion.start_date,
          date_end: suggestion.end_date,
          location_name: suggestion.location_name,
          location_lat: suggestion.latitude,
          location_lng: suggestion.longitude,
          visibility: 'public',
          status: 'published',
        })
        .select()
        .single();

      if (albumError) throw albumError;

      // Assign photos to album
      const photoUpdates = suggestion.photos.map((photo, index) => ({
        id: photo.id,
        album_id: album.id,
        order_index: index,
      }));

      for (const update of photoUpdates) {
        await supabase
          .from('photos')
          .update({
            album_id: update.album_id,
            order_index: update.order_index,
          })
          .eq('id', update.id);
      }

      // Set cover photo
      if (suggestion.photos.length > 0) {
        await supabase
          .from('albums')
          .update({
            cover_photo_url: suggestion.photos[0].file_path,
          })
          .eq('id', album.id);
      }

      await Toast.show({
        text: `Album "${suggestion.suggested_title}" created!`,
        duration: 'short',
      });

      // Remove suggestion from list
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));

      // Navigate to album
      router.push(`/albums/${album.id}`);
    } catch (error) {
      log.error('Failed to create album from suggestion', { component: 'AlbumSuggestions' }, error as Error);
      await Toast.show({
        text: 'Failed to create album',
        duration: 'short',
      });
    } finally {
      setCreating(null);
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(suggestions.filter(s => s.id !== suggestionId));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing your photos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h2 className="text-xl font-bold">Album Suggestions</h2>
        <Badge variant="secondary" className="ml-2">
          AI-Generated
        </Badge>
      </div>

      <p className="text-sm text-gray-600">
        We found {suggestions.length} potential album{suggestions.length > 1 ? 's' : ''} based on your photos&apos; dates and locations.
      </p>

      <div className="grid gap-4">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{suggestion.suggested_title}</CardTitle>
                  <CardDescription className="mt-1">
                    {suggestion.suggested_description}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    suggestion.confidence_score >= 80
                      ? 'default'
                      : suggestion.confidence_score >= 60
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {suggestion.confidence_score}% match
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {suggestion.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(suggestion.start_date).toLocaleDateString()} - {new Date(suggestion.end_date!).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {suggestion.location_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{suggestion.location_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  <span>{suggestion.photos.length} photos</span>
                </div>
              </div>

              {/* Photo preview */}
              <div className="grid grid-cols-4 gap-2">
                {suggestion.photos.slice(0, 4).map((photo, index) => (
                  <div key={photo.id} className="relative aspect-square">
                    <Image
                      src={getPhotoUrl(photo.file_path) || ''}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                ))}
                {suggestion.photos.length > 4 && (
                  <div className="relative aspect-square bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      +{suggestion.photos.length - 4} more
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => createAlbumFromSuggestion(suggestion)}
                  disabled={creating !== null}
                  className="flex-1"
                >
                  {creating === suggestion.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Album
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => dismissSuggestion(suggestion.id)}
                  disabled={creating !== null}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Reason */}
              <p className="text-xs text-gray-500 italic">
                Suggested because: {suggestion.reason}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
