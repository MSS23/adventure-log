import { Photo } from '@/types/database';

export interface PhotoCluster {
  id: string;
  latitude: number;
  longitude: number;
  photos: Photo[];
  count: number;
  location_name?: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Cluster photos by proximity using a simple distance-based algorithm
 * @param photos - Array of photos with GPS coordinates
 * @param clusterRadius - Maximum distance in km to consider photos in the same cluster (default: 50km)
 */
export function clusterPhotos(
  photos: Photo[],
  clusterRadius: number = 50
): PhotoCluster[] {
  // Filter photos that have GPS coordinates
  const photosWithLocation = photos.filter(
    photo => photo.latitude != null && photo.longitude != null
  );

  if (photosWithLocation.length === 0) {
    return [];
  }

  const clusters: PhotoCluster[] = [];
  const processedPhotos = new Set<string>();

  for (const photo of photosWithLocation) {
    if (processedPhotos.has(photo.id)) {
      continue;
    }

    // Create new cluster with this photo
    const clusterPhotos: Photo[] = [photo];
    processedPhotos.add(photo.id);

    // Find all nearby photos
    for (const otherPhoto of photosWithLocation) {
      if (processedPhotos.has(otherPhoto.id)) {
        continue;
      }

      const distance = calculateDistance(
        photo.latitude!,
        photo.longitude!,
        otherPhoto.latitude!,
        otherPhoto.longitude!
      );

      if (distance <= clusterRadius) {
        clusterPhotos.push(otherPhoto);
        processedPhotos.add(otherPhoto.id);
      }
    }

    // Calculate cluster center (average of all photo locations)
    const centerLat =
      clusterPhotos.reduce((sum, p) => sum + (p.latitude || 0), 0) / clusterPhotos.length;
    const centerLon =
      clusterPhotos.reduce((sum, p) => sum + (p.longitude || 0), 0) / clusterPhotos.length;

    // Use the most common location name in the cluster
    const locationNames = clusterPhotos
      .filter(p => p.location_name)
      .map(p => p.location_name!);
    const mostCommonLocation = getMostCommon(locationNames);

    clusters.push({
      id: `cluster-${photo.id}`,
      latitude: centerLat,
      longitude: centerLon,
      photos: clusterPhotos,
      count: clusterPhotos.length,
      location_name: mostCommonLocation || clusterPhotos[0].location_name,
    });
  }

  return clusters;
}

/**
 * Get the most common element in an array
 */
function getMostCommon<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;

  const counts = new Map<T, number>();
  let maxCount = 0;
  let mostCommon: T | undefined;

  for (const item of arr) {
    const count = (counts.get(item) || 0) + 1;
    counts.set(item, count);

    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }

  return mostCommon;
}

/**
 * Get a representative photo from a cluster (preferably with highest quality or most recent)
 */
export function getClusterRepresentativePhoto(cluster: PhotoCluster): Photo {
  // Prefer photos with captions or favorites
  const withCaption = cluster.photos.find(p => p.caption);
  if (withCaption) return withCaption;

  const favorite = cluster.photos.find(p => p.is_favorite);
  if (favorite) return favorite;

  // Otherwise return the first photo (could be enhanced to check file size or taken_at)
  return cluster.photos[0];
}
