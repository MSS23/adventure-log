import { Photo, Album } from '@/types/database';
import JSZip from 'jszip';
import { getPhotoUrl } from './photo-url';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeOriginalNames?: boolean;
  format?: 'zip';
}

/**
 * Download an album as a ZIP file
 */
export async function exportAlbumAsZip(
  album: Album,
  photos: Photo[],
  options: ExportOptions = {}
): Promise<void> {
  const {
    includeMetadata = true,
    includeOriginalNames = false,
  } = options;

  try {
    const zip = new JSZip();

    // Create album folder
    const albumFolder = zip.folder(sanitizeFilename(album.title));
    if (!albumFolder) throw new Error('Failed to create album folder');

    // Add metadata file
    if (includeMetadata) {
      const metadata = generateAlbumMetadata(album, photos);
      albumFolder.file('README.txt', metadata);
    }

    // Download and add photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const photoUrl = getPhotoUrl(photo.file_path);

      if (!photoUrl) continue;

      try {
        // Fetch photo
        const response = await fetch(photoUrl);
        if (!response.ok) continue;

        const blob = await response.blob();

        // Generate filename
        const ext = getFileExtension(photo.file_path) || 'jpg';
        const filename = includeOriginalNames && photo.caption
          ? `${sanitizeFilename(photo.caption)}.${ext}`
          : `${String(i + 1).padStart(3, '0')}.${ext}`;

        albumFolder.file(filename, blob);

        // Add photo metadata
        if (includeMetadata && hasPhotoMetadata(photo)) {
          const photoMetadata = generatePhotoMetadata(photo);
          albumFolder.file(`${filename}.txt`, photoMetadata);
        }
      } catch (error) {
        console.error(`Failed to download photo ${photo.id}:`, error);
        // Continue with other photos
      }
    }

    // Generate ZIP
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${sanitizeFilename(album.title)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to export album:', error);
    throw new Error('Failed to export album');
  }
}

/**
 * Generate album metadata text
 */
function generateAlbumMetadata(album: Album, photos: Photo[]): string {
  const lines: string[] = [];

  lines.push(`Album: ${album.title}`);
  lines.push(`=================${'='.repeat(album.title.length)}`);
  lines.push('');

  if (album.description) {
    lines.push(`Description: ${album.description}`);
    lines.push('');
  }

  if (album.location_name) {
    lines.push(`Location: ${album.location_name}`);
  }

  if (album.date_start) {
    const start = new Date(album.date_start).toLocaleDateString();
    const end = album.date_end ? new Date(album.date_end).toLocaleDateString() : null;
    lines.push(`Dates: ${start}${end && end !== start ? ` - ${end}` : ''}`);
  }

  lines.push('');
  lines.push(`Photos: ${photos.length}`);
  lines.push('');

  if (album.copyright_holder || album.license_type) {
    lines.push('Copyright Information:');
    lines.push('---');
    if (album.copyright_holder) {
      lines.push(`© ${album.copyright_holder}`);
    }
    if (album.license_type) {
      lines.push(`License: ${album.license_type}`);
      if (album.license_url) {
        lines.push(`License URL: ${album.license_url}`);
      }
    }
    lines.push('');
  }

  lines.push('');
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push(`From: Adventure Log`);

  return lines.join('\n');
}

/**
 * Generate photo metadata text
 */
function generatePhotoMetadata(photo: Photo): string {
  const lines: string[] = [];

  if (photo.caption) {
    lines.push(`Caption: ${photo.caption}`);
  }

  if (photo.taken_at) {
    lines.push(`Date: ${new Date(photo.taken_at).toLocaleString()}`);
  }

  if (photo.location_name) {
    lines.push(`Location: ${photo.location_name}`);
  }

  if (photo.latitude && photo.longitude) {
    lines.push(`Coordinates: ${photo.latitude}, ${photo.longitude}`);
  }

  if (photo.camera_make || photo.camera_model) {
    lines.push(`Camera: ${[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}`);
  }

  if (photo.iso || photo.aperture || photo.shutter_speed) {
    const settings: string[] = [];
    if (photo.iso) settings.push(`ISO ${photo.iso}`);
    if (photo.aperture) settings.push(photo.aperture);
    if (photo.shutter_speed) settings.push(photo.shutter_speed);
    lines.push(`Settings: ${settings.join(' • ')}`);
  }

  if (photo.photographer_credit) {
    lines.push(`Photographer: ${photo.photographer_credit}`);
  }

  if (photo.copyright_holder) {
    lines.push(`Copyright: © ${photo.copyright_holder}`);
  }

  if (photo.license_type) {
    lines.push(`License: ${photo.license_type}`);
  }

  return lines.join('\n');
}

/**
 * Check if photo has any metadata worth exporting
 */
function hasPhotoMetadata(photo: Photo): boolean {
  return !!(
    photo.caption ||
    photo.location_name ||
    photo.taken_at ||
    photo.camera_make ||
    photo.camera_model ||
    photo.photographer_credit ||
    photo.copyright_holder
  );
}

/**
 * Sanitize filename for safe file system use
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .slice(0, 200); // Limit length
}

/**
 * Get file extension from path
 */
function getFileExtension(path: string): string | null {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Calculate estimated export size
 */
export function estimateExportSize(photos: Photo[]): number {
  // Rough estimate: average 3MB per photo
  const avgPhotoSize = 3 * 1024 * 1024; // 3MB in bytes
  return photos.length * avgPhotoSize;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
