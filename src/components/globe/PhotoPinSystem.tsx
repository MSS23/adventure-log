import { useMemo } from 'react';
import { Photo } from '@/types/database';
import { clusterPhotos, PhotoCluster, getClusterRepresentativePhoto } from '@/lib/utils/photo-clustering';
import { getPhotoUrl } from '@/lib/utils/photo-url';

export interface PhotoPin {
  id: string;
  lat: number;
  lng: number;
  photos: Photo[];
  count: number;
  location_name?: string;
  preview_url?: string;
}

export interface PhotoPinSystemResult {
  pins: PhotoPin[];
  pinData: PhotoPin[];
}

export function usePhotoPinSystem(photos: Photo[], clusterRadius: number = 30): PhotoPinSystemResult {
  const pins = useMemo(() => {
    const clusters = clusterPhotos(photos, clusterRadius);

    return clusters.map((cluster: PhotoCluster): PhotoPin => {
      const representative = getClusterRepresentativePhoto(cluster);

      return {
        id: cluster.id,
        lat: cluster.latitude,
        lng: cluster.longitude,
        photos: cluster.photos,
        count: cluster.count,
        location_name: cluster.location_name,
        preview_url: getPhotoUrl(representative.file_path) || undefined,
      };
    });
  }, [photos, clusterRadius]);

  return {
    pins,
    pinData: pins,
  };
}

export function formatPhotoTooltip(pin: PhotoPin): string {
  const countText = pin.count === 1 ? '1 photo' : `${pin.count} photos`;
  const locationText = pin.location_name ? `${pin.location_name} - ` : '';
  return `${locationText}${countText}`;
}

// HTML element renderer for photo pins
export function renderPhotoPin(pin: PhotoPin): HTMLElement {
  const el = document.createElement('div');
  el.className = 'photo-pin';
  el.style.cssText = `
    width: 32px;
    height: 32px;
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
    font-size: 12px;
    transition: transform 0.2s;
    position: relative;
  `;

  // Add photo count badge
  if (pin.count > 1) {
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: #e53e3e;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      border: 2px solid white;
    `;
    badge.textContent = pin.count > 99 ? '99+' : pin.count.toString();
    el.appendChild(badge);
  }

  // Add camera icon
  const icon = document.createElement('span');
  icon.textContent = '📷';
  icon.style.fontSize = '16px';
  el.appendChild(icon);

  // Add hover effect
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });

  // Add tooltip
  el.title = formatPhotoTooltip(pin);

  return el;
}
