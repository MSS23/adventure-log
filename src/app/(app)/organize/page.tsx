'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Filter,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getPhotoUrl } from '@/lib/utils/photo-url';
import { getFlagEmoji, extractCountryFromLocation } from '@/lib/utils/country';
import { getCountryCodeFromName } from '@/lib/utils/country-search';
import { log } from '@/lib/utils/logger';
import { Toast } from '@capacitor/toast';
import type { Photo, Album } from '@/types/database';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'no-album' | 'date' | 'location';

// Photos store a free-text location_name but no country_code, so derive the
// flag from the country portion of the location string ("City, Region, Country").
function flagForLocation(locationName?: string | null): string | null {
  if (!locationName) return null;
  const countryName = extractCountryFromLocation(locationName);
  if (!countryName) return null;
  const code = getCountryCodeFromName(countryName);
  return code ? getFlagEmoji(code) : null;
}

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Fetch albums
      const { data: albumsData } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAlbums(albumsData || []);

      // Fetch photos based on filter
      let query = supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id);

      if (filterType === 'no-album') {
        query = query.is('album_id', null);
      }

      // Respect the chosen sort. Previously every filter ordered by taken_at,
      // so "By location" was a no-op; group by location_name when chosen.
      if (filterType === 'location') {
        query = query
          .order('location_name', { ascending: true, nullsFirst: false })
          .order('taken_at', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('taken_at', { ascending: false, nullsFirst: false });
      }

      const { data: photosData, error } = await query;

      if (error) throw error;

      setPhotos(photosData || []);
    } catch (error) {
      log.error('Failed to fetch photos', { component: 'OrganizePage' }, error as Error);
      // Keep photos as an array so downstream .length/.filter never crash
      setPhotos([]);
      await Toast.show({
        text: 'Failed to load photos',
        duration: 'short',
      });
    } finally {
      setLoading(false);
    }
  }, [user, filterType, supabase]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

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

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        photo.caption?.toLowerCase().includes(query) ||
        photo.location_name?.toLowerCase().includes(query)
      );
    });
  }, [photos, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="al-eyebrow mb-0.5">Curate</p>
              <h1 className="al-display text-2xl md:text-3xl">Organizer</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="cursor-pointer"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="cursor-pointer"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by caption or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All photos</SelectItem>
                <SelectItem value="no-album" className="cursor-pointer">Unorganized</SelectItem>
                <SelectItem value="date" className="cursor-pointer">By date</SelectItem>
                <SelectItem value="location" className="cursor-pointer">By location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection toolbar — stacks on mobile so the move/delete controls
              never overflow or overlap; single row from sm up. */}
          {selectedPhotos.size > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {selectedPhotos.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="cursor-pointer whitespace-nowrap"
                >
                  {selectedPhotos.size === photos.length ? 'Deselect all' : 'Select all'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select onValueChange={handleMoveToAlbum}>
                  <SelectTrigger className="flex-1 min-w-0 sm:w-[200px] sm:flex-none cursor-pointer">
                    <Move className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Move to album..." />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map(album => (
                      <SelectItem key={album.id} value={album.id} className="cursor-pointer">
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="cursor-pointer shrink-0"
                  aria-label="Delete selected"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPhotos(new Set())}
                  className="cursor-pointer shrink-0"
                  aria-label="Clear selection"
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
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading photos...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          searchQuery ? (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                No matching photos
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing matches &ldquo;{searchQuery}&rdquo;. Try a different caption or location.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-5 cursor-pointer"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Grid3x3 className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Nothing to organize yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filterType === 'no-album'
                  ? 'All your photos are already filed into albums.'
                  : 'Upload photos to start sorting them into albums.'}
              </p>
              <Link href="/albums/new" className="mt-5">
                <Button size="sm" className="cursor-pointer">
                  Create an album
                </Button>
              </Link>
            </div>
          )
        ) : (
          <div
            ref={gridRef}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'space-y-2'
            }
          >
            {filteredPhotos.map(photo => {
              const locationFlag = flagForLocation(photo.location_name);
              return (
              <div
                key={photo.id}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'aspect-square rounded-xl overflow-hidden bg-muted hover:shadow-md hover:scale-[1.02]'
                    : 'flex items-center gap-4 p-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md'
                } ${selectedPhotos.has(photo.id) ? 'ring-2 ring-primary' : ''}`}
                onClick={() => togglePhotoSelection(photo.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePhotoSelection(photo.id) } }}
              >
                {viewMode === 'grid' ? (
                  <>
                    <Image
                      src={getPhotoUrl(photo.file_path) || ''}
                      alt={photo.caption || 'Photo'}
                      fill
                      className="object-cover rounded-xl"
                    />
                    <div
                      className={`absolute top-2 left-2 p-1 rounded-md transition-opacity duration-200 ${
                        selectedPhotos.has(photo.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background/85 text-foreground opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </div>
                    {photo.location_name && (
                      <div className="absolute bottom-2 left-2 right-2 inline-flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                        {locationFlag && (
                          <span className="shrink-0 leading-none" aria-hidden>{locationFlag}</span>
                        )}
                        <span className="truncate">{photo.location_name}</span>
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
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {photo.caption || 'Untitled'}
                      </p>
                      {photo.location_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {locationFlag ? (
                            <span className="shrink-0 leading-none" aria-hidden>{locationFlag}</span>
                          ) : (
                            <MapPin className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{photo.location_name}</span>
                        </p>
                      )}
                      {photo.taken_at && (
                        <p className="text-xs text-muted-foreground font-mono tracking-wide flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(photo.taken_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help (desktop only) */}
      <div className="hidden md:block fixed bottom-4 right-4 max-w-xs rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground shadow-lg">
        <p className="font-semibold mb-2 text-foreground">Keyboard Shortcuts:</p>
        <ul className="space-y-1">
          <li><kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + A</kbd> - Select all</li>
          <li><kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Esc</kbd> - Clear selection</li>
          <li><kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Delete</kbd> - Delete selected</li>
        </ul>
      </div>
    </div>
  );
}
