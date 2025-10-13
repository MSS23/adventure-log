'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Grid3x3,
  List,
  CheckSquare,
  Square,
  Trash2,
  Calendar,
  MapPin,
  Search,
  X,
  Move,
  Filter
} from 'lucide-react';
import Image from 'next/image';
import { getPhotoUrl } from '@/lib/utils/photo-url';
import { log } from '@/lib/utils/logger';
import { Toast } from '@capacitor/toast';
import type { Photo, Album } from '@/types/database';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'no-album' | 'date' | 'location';

export default function OrganizePage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch albums
      const { data: albumsData } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      setAlbums(albumsData || []);

      // Fetch photos based on filter
      let query = supabase
        .from('photos')
        .select('*')
        .eq('user_id', user!.id);

      if (filterType === 'no-album') {
        query = query.is('album_id', null);
      }

      query = query.order('taken_at', { ascending: false, nullsFirst: false });

      const { data: photosData, error } = await query;

      if (error) throw error;

      setPhotos(photosData || []);
    } catch (error) {
      log.error('Failed to fetch photos', { component: 'OrganizePage' }, error as Error);
      await Toast.show({
        text: 'Failed to load photos',
        duration: 'short',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const handleMoveToAlbum = async (albumId: string) => {
    if (selectedPhotos.size === 0) return;

    try {
      const updates = Array.from(selectedPhotos).map(photoId => ({
        id: photoId,
        album_id: albumId,
      }));

      for (const update of updates) {
        await supabase
          .from('photos')
          .update({ album_id: update.album_id })
          .eq('id', update.id);
      }

      await Toast.show({
        text: `Moved ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''} to album`,
        duration: 'short',
      });

      setSelectedPhotos(new Set());
      fetchData();
    } catch (error) {
      log.error('Failed to move photos', { component: 'OrganizePage' }, error as Error);
      await Toast.show({
        text: 'Failed to move photos',
        duration: 'short',
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}?`
    );

    if (!confirmed) return;

    try {
      for (const photoId of selectedPhotos) {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) continue;

        // Delete from storage
        if (photo.file_path) {
          await supabase.storage
            .from('photos')
            .remove([photo.file_path]);
        }

        // Delete from database
        await supabase
          .from('photos')
          .delete()
          .eq('id', photoId);
      }

      await Toast.show({
        text: `Deleted ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`,
        duration: 'short',
      });

      setSelectedPhotos(new Set());
      fetchData();
    } catch (error) {
      log.error('Failed to delete photos', { component: 'OrganizePage' }, error as Error);
      await Toast.show({
        text: 'Failed to delete photos',
        duration: 'short',
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        setSelectedPhotos(new Set());
      }

      // Delete: Delete selected
      if (e.key === 'Delete' && selectedPhotos.size > 0) {
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotos, photos]);

  const filteredPhotos = photos.filter(photo => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      photo.caption?.toLowerCase().includes(query) ||
      photo.location_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Photo Organizer</h1>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by caption or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All photos</SelectItem>
                <SelectItem value="no-album">Unorganized</SelectItem>
                <SelectItem value="date">By date</SelectItem>
                <SelectItem value="location">By location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection toolbar */}
          {selectedPhotos.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-900">
                  {selectedPhotos.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  {selectedPhotos.size === photos.length ? 'Deselect all' : 'Select all'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select onValueChange={handleMoveToAlbum}>
                  <SelectTrigger className="w-[200px]">
                    <Move className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Move to album..." />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map(album => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPhotos(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading photos...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? 'No photos match your search' : 'No photos to organize'}
            </p>
          </div>
        ) : (
          <div
            ref={gridRef}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'space-y-2'
            }
          >
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className={`relative group cursor-pointer ${
                  viewMode === 'grid'
                    ? 'aspect-square'
                    : 'flex items-center gap-4 p-3 bg-white rounded-lg border hover:border-blue-300'
                }`}
                onClick={() => togglePhotoSelection(photo.id)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <Image
                      src={getPhotoUrl(photo.file_path) || ''}
                      alt={photo.caption || 'Photo'}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <div
                      className={`absolute top-2 left-2 p-1 rounded ${
                        selectedPhotos.has(photo.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/80 text-gray-600 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </div>
                    {photo.location_name && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                        {photo.location_name}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={getPhotoUrl(photo.file_path) || ''}
                        alt={photo.caption || 'Photo'}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {photo.caption || 'Untitled'}
                      </p>
                      {photo.location_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {photo.location_name}
                        </p>
                      )}
                      {photo.taken_at && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(photo.taken_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 right-4 p-3 bg-white rounded-lg shadow-lg text-xs text-gray-600 max-w-xs">
        <p className="font-semibold mb-2">Keyboard Shortcuts:</p>
        <ul className="space-y-1">
          <li><kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl/⌘ + A</kbd> - Select all</li>
          <li><kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> - Clear selection</li>
          <li><kbd className="px-1 py-0.5 bg-gray-100 rounded">Delete</kbd> - Delete selected</li>
        </ul>
      </div>
    </div>
  );
}
