import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Photo } from '@/types/database';
import { log } from '@/lib/utils/logger';
import { filterDuplicatePhotos } from '@/lib/utils/photo-deduplication';

interface UsePhotosOptions {
  userId?: string;
  withLocation?: boolean; // Only fetch photos with GPS coordinates
  albumId?: string;
}

interface UsePhotosResult {
  photos: Photo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePhotos(options: UsePhotosOptions = {}): UsePhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Destructure options for stable dependencies
  const { userId, albumId, withLocation } = options;

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('photos').select('*');

      // Filter by user if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Filter by album if provided
      if (albumId) {
        query = query.eq('album_id', albumId);
      }

      // Only fetch photos with location if specified
      if (withLocation) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      // Order by taken date (most recent first)
      query = query.order('taken_at', { ascending: false, nullsFirst: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        log.error('Failed to fetch photos', {
          component: 'usePhotos',
          action: 'fetchPhotos',
          userId,
          albumId,
          withLocation,
        }, fetchError);
        throw fetchError;
      }

      // Filter out duplicate photos
      const filteredPhotos = filterDuplicatePhotos(data || []);
      setPhotos(filteredPhotos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photos';
      setError(errorMessage);
      log.error('Error in usePhotos', {
        component: 'usePhotos',
        action: 'fetchPhotos',
        userId,
        albumId,
        withLocation,
      }, err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userId, albumId, withLocation, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    error,
    refetch: fetchPhotos,
  };
}
