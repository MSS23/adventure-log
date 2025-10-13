'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Photo } from '@/types/database';
import { clusterPhotos, PhotoCluster } from '@/lib/utils/photo-clustering';
import { getPhotoUrl } from '@/lib/utils/photo-url';
import { MapPin, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface PhotoMapProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  className?: string;
  mapboxToken?: string;
}

export function PhotoMap({ photos, onPhotoClick, className, mapboxToken }: PhotoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<PhotoCluster | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter photos with GPS coordinates
  const photosWithLocation = useMemo(() => photos.filter(
    photo => photo.latitude != null && photo.longitude != null
  ), [photos]);

  // Cluster nearby photos
  const clusters = useMemo(() => clusterPhotos(photosWithLocation, 5), [photosWithLocation]); // 5km radius

  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: clusters.length > 0
        ? [clusters[0].longitude, clusters[0].latitude]
        : [0, 0],
      zoom: clusters.length > 0 ? 10 : 2,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      setMapLoaded(true);
    });

    map.current = mapInstance;

    return () => {
      map.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Add markers when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || clusters.length === 0) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add cluster markers
    clusters.forEach(cluster => {
      const el = document.createElement('div');
      el.className = 'photo-map-marker';
      el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        transition: transform 0.2s;
      `;

      if (cluster.count > 1) {
        el.textContent = cluster.count.toString();
      } else {
        el.textContent = '📷'; // SECURITY: Use textContent instead of innerHTML to prevent XSS
      }

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([cluster.longitude, cluster.latitude])
        .addTo(map.current!);

      // Click handler
      el.addEventListener('click', () => {
        setSelectedCluster(cluster);

        // Fly to marker
        map.current?.flyTo({
          center: [cluster.longitude, cluster.latitude],
          zoom: 14,
          duration: 1000,
        });
      });

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (clusters.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      clusters.forEach(cluster => {
        bounds.extend([cluster.longitude, cluster.latitude]);
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }
  }, [mapLoaded, clusters]);

  if (!mapboxToken) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center p-12 ${className}`}>
        <div className="text-center text-gray-600">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Map requires Mapbox access token</p>
          <p className="text-sm mt-2">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment</p>
        </div>
      </div>
    );
  }

  if (photosWithLocation.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center p-12 ${className}`}>
        <div className="text-center text-gray-600">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No photos with location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Selected cluster popup */}
      {selectedCluster && (
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">
                {selectedCluster.location_name || 'Photos'}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedCluster.count} photo{selectedCluster.count > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setSelectedCluster(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {selectedCluster.photos.slice(0, 8).map(photo => (
              <button
                key={photo.id}
                onClick={() => {
                  if (onPhotoClick) {
                    onPhotoClick(photo);
                  }
                  setSelectedCluster(null);
                }}
                className="relative aspect-square rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
              >
                <Image
                  src={getPhotoUrl(photo.file_path) || ''}
                  alt={photo.caption || 'Photo'}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
            {selectedCluster.count > 8 && (
              <div className="aspect-square bg-gray-100 rounded flex items-center justify-center text-sm text-gray-600">
                +{selectedCluster.count - 8}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
