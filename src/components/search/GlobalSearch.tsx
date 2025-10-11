'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  Image as ImageIcon,
  Folder,
  MapPin,
  Calendar,
  Loader2,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { getPhotoUrl } from '@/lib/utils/photo-url';
import type { Album, Photo } from '@/types/database';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'album' | 'photo';
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  date?: string;
  location?: string;
  albumId?: string; // For photos
}

export function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, user]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);

    try {
      const lowerQuery = searchQuery.toLowerCase();

      // Search albums
      const { data: albums } = await supabase
        .from('albums')
        .select('id, title, description, location_name, date_start, cover_photo_url')
        .eq('user_id', user!.id)
        .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%,location_name.ilike.%${lowerQuery}%`)
        .limit(10);

      // Search photos
      const { data: photos } = await supabase
        .from('photos')
        .select('id, album_id, caption, location_name, taken_at, file_path')
        .eq('user_id', user!.id)
        .or(`caption.ilike.%${lowerQuery}%,location_name.ilike.%${lowerQuery}%`)
        .limit(10);

      const searchResults: SearchResult[] = [];

      // Add albums
      if (albums) {
        albums.forEach(album => {
          searchResults.push({
            type: 'album',
            id: album.id,
            title: album.title,
            subtitle: album.description || undefined,
            thumbnail: album.cover_photo_url ? getPhotoUrl(album.cover_photo_url) || undefined : undefined,
            date: album.date_start || undefined,
            location: album.location_name || undefined,
          });
        });
      }

      // Add photos
      if (photos) {
        photos.forEach(photo => {
          searchResults.push({
            type: 'photo',
            id: photo.id,
            title: photo.caption || 'Untitled Photo',
            subtitle: photo.location_name || undefined,
            thumbnail: getPhotoUrl(photo.file_path) || undefined,
            date: photo.taken_at || undefined,
            location: photo.location_name || undefined,
            albumId: photo.album_id,
          });
        });
      }

      // Sort by relevance (albums first, then photos)
      searchResults.sort((a, b) => {
        if (a.type === 'album' && b.type === 'photo') return -1;
        if (a.type === 'photo' && b.type === 'album') return 1;
        return 0;
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'album') {
      router.push(`/albums/${result.id}`);
    } else if (result.type === 'photo' && result.albumId) {
      router.push(`/albums/${result.albumId}?photo=${result.id}`);
    }

    // Clear search
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setResults([]);
        setFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showResults = focused && (results.length > 0 || loading);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search albums, photos, locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left',
                    index === selectedIndex && 'bg-blue-50'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {result.thumbnail ? (
                      <Image
                        src={result.thumbnail}
                        alt={result.title}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {result.type === 'album' ? (
                          <Folder className="h-6 w-6 text-gray-400" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.type === 'album' ? 'default' : 'secondary'} className="text-xs">
                        {result.type}
                      </Badge>
                      <h4 className="font-medium text-sm truncate">{result.title}</h4>
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500 truncate mt-1">{result.subtitle}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {result.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {result.location}
                        </span>
                      )}
                      {result.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(result.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span>{results.length} results</span>
          </div>
        </div>
      )}
    </div>
  );
}
