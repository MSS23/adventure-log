import { Photo } from '@/types/database';
import { clusterPhotos, PhotoCluster } from '@/lib/utils/photo-clustering';

export interface AlbumSuggestion {
  id: string;
  suggested_title: string;
  suggested_description: string;
  photos: Photo[];
  start_date?: string;
  end_date?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  confidence_score: number;
  reason: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Analyze photos and suggest album groupings based on:
 * - Date proximity (photos within 3 days = same trip)
 * - Location clustering (within 50km)
 * - Time gaps between photos
 */
export function generateAlbumSuggestions(photos: Photo[]): AlbumSuggestion[] {
  // Filter photos with dates
  const photosWithDates = photos.filter(p => p.taken_at).sort((a, b) => {
    return new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime();
  });

  if (photosWithDates.length === 0) {
    return [];
  }

  const suggestions: AlbumSuggestion[] = [];
  const processed = new Set<string>();

  // Group photos by date proximity (3-day gap threshold)
  const DAY_GAP_THRESHOLD = 3;
  const dateGroups: Photo[][] = [];
  let currentGroup: Photo[] = [photosWithDates[0]];

  for (let i = 1; i < photosWithDates.length; i++) {
    const prevDate = new Date(photosWithDates[i - 1].taken_at!);
    const currDate = new Date(photosWithDates[i].taken_at!);
    const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDiff <= DAY_GAP_THRESHOLD) {
      currentGroup.push(photosWithDates[i]);
    } else {
      if (currentGroup.length >= 3) {
        // Only suggest if there are at least 3 photos
        dateGroups.push(currentGroup);
      }
      currentGroup = [photosWithDates[i]];
    }
  }

  // Don't forget the last group
  if (currentGroup.length >= 3) {
    dateGroups.push(currentGroup);
  }

  // For each date group, further cluster by location
  for (const group of dateGroups) {
    // Cluster photos by location
    const locationClusters = clusterPhotos(group, 50); // 50km radius

    for (const cluster of locationClusters) {
      if (cluster.photos.length < 3) continue; // Skip small clusters

      const photos = cluster.photos;
      const dates = photos.map(p => new Date(p.taken_at!)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      // Generate title based on location and date
      const title = generateAlbumTitle(cluster, startDate, endDate);
      const description = generateAlbumDescription(cluster, startDate, endDate);

      // Calculate confidence score based on various factors
      const confidence = calculateConfidenceScore(cluster, startDate, endDate);

      suggestions.push({
        id: `suggestion-${cluster.id}`,
        suggested_title: title,
        suggested_description: description,
        photos: photos,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location_name: cluster.location_name,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        confidence_score: confidence,
        reason: generateReason(cluster, startDate, endDate),
      });
    }
  }

  // Sort by confidence score (highest first)
  return suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
}

/**
 * Generate a suggested album title based on location and date
 */
function generateAlbumTitle(cluster: PhotoCluster, startDate: Date, endDate: Date): string {
  const monthYear = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (cluster.location_name) {
    // Extract city name from location_name if possible
    const parts = cluster.location_name.split(',');
    const cityName = parts[0].trim();
    return `${cityName} - ${monthYear}`;
  }

  // Fallback to just date
  return `Trip - ${monthYear}`;
}

/**
 * Generate a suggested album description
 */
function generateAlbumDescription(cluster: PhotoCluster, startDate: Date, endDate: Date): string {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const photoCount = cluster.photos.length;

  if (daysDiff === 0) {
    return `${photoCount} photos from a day ${cluster.location_name ? `in ${cluster.location_name}` : ''}.`;
  } else {
    return `${photoCount} photos from a ${daysDiff + 1}-day trip${cluster.location_name ? ` to ${cluster.location_name}` : ''}.`;
  }
}

/**
 * Calculate confidence score (0-100) based on:
 * - Number of photos
 * - Date range consistency
 * - Location data availability
 * - Photo density (photos per day)
 */
function calculateConfidenceScore(cluster: PhotoCluster, startDate: Date, endDate: Date): number {
  let score = 0;

  // Photo count score (max 30 points)
  const photoCount = cluster.photos.length;
  if (photoCount >= 20) score += 30;
  else if (photoCount >= 10) score += 25;
  else if (photoCount >= 5) score += 20;
  else score += 15;

  // Location data availability (max 25 points)
  if (cluster.location_name) score += 25;
  else if (cluster.latitude && cluster.longitude) score += 15;

  // Date range consistency (max 25 points)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) score += 25;
  else if (daysDiff <= 14) score += 20;
  else if (daysDiff <= 30) score += 15;
  else score += 10;

  // Photo density (max 20 points)
  const photosPerDay = photoCount / (daysDiff + 1);
  if (photosPerDay >= 5) score += 20;
  else if (photosPerDay >= 3) score += 15;
  else if (photosPerDay >= 1) score += 10;
  else score += 5;

  return Math.min(100, score);
}

/**
 * Generate a human-readable reason for the suggestion
 */
function generateReason(cluster: PhotoCluster, startDate: Date, endDate: Date): string {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const photoCount = cluster.photos.length;

  const reasons: string[] = [];

  reasons.push(`${photoCount} photos taken`);

  if (daysDiff === 0) {
    reasons.push('on the same day');
  } else {
    reasons.push(`over ${daysDiff + 1} days`);
  }

  if (cluster.location_name) {
    reasons.push(`in ${cluster.location_name}`);
  }

  return reasons.join(' ') + '.';
}

/**
 * Filter out suggestions that overlap with existing albums
 */
export function filterExistingAlbums(
  suggestions: AlbumSuggestion[],
  existingAlbumPhotoIds: Set<string>
): AlbumSuggestion[] {
  return suggestions
    .map(suggestion => {
      // Filter out photos that are already in albums
      const newPhotos = suggestion.photos.filter(p => !existingAlbumPhotoIds.has(p.id));

      if (newPhotos.length < 3) {
        return null; // Skip if too few photos remain
      }

      return {
        ...suggestion,
        photos: newPhotos,
        confidence_score: (suggestion.confidence_score * newPhotos.length) / suggestion.photos.length,
      };
    })
    .filter((s): s is AlbumSuggestion => s !== null);
}
