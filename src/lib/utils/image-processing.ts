/**
 * Image processing utilities for generating thumbnails and optimized versions
 * Uses browser Canvas API for client-side processing
 */

export interface ImageSize {
  width: number;
  height: number;
  quality: number;
  suffix: string;
}

export const IMAGE_SIZES: Record<string, ImageSize> = {
  thumbnail: {
    width: 200,
    height: 200,
    quality: 0.8,
    suffix: '_thumb',
  },
  medium: {
    width: 800,
    height: 800,
    quality: 0.85,
    suffix: '_medium',
  },
  large: {
    width: 1600,
    height: 1600,
    quality: 0.9,
    suffix: '_large',
  },
};

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  size: number;
}

/**
 * Load an image from a file and return it as an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Resize an image to fit within maxWidth x maxHeight while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate scaling factor
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = width / aspectRatio;
    } else {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Resize and compress an image
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.9
): Promise<ProcessedImage> {
  const img = await loadImage(file);

  const dimensions = calculateDimensions(img.width, img.height, maxWidth, maxHeight);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw resized image
  ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });

  return {
    blob,
    width: dimensions.width,
    height: dimensions.height,
    size: blob.size,
  };
}

/**
 * Generate multiple sizes of an image (thumbnail, medium, large)
 */
export async function generateImageSizes(
  file: File
): Promise<Record<string, ProcessedImage>> {
  const sizes: Record<string, ProcessedImage> = {};

  // Generate each size
  for (const [key, config] of Object.entries(IMAGE_SIZES)) {
    try {
      sizes[key] = await resizeImage(file, config.width, config.height, config.quality);
    } catch (error) {
      console.error(`Failed to generate ${key} size:`, error);
      // Continue with other sizes even if one fails
    }
  }

  return sizes;
}

/**
 * Get the appropriate image size to use based on container dimensions
 */
export function getOptimalImageSize(
  containerWidth: number,
  containerHeight: number
): keyof typeof IMAGE_SIZES {
  const maxDimension = Math.max(containerWidth, containerHeight);

  if (maxDimension <= 200) return 'thumbnail';
  if (maxDimension <= 800) return 'medium';
  return 'large';
}

/**
 * Generate a filename with size suffix
 * Example: photo.jpg -> photo_thumb.jpg
 */
export function generateSizedFilename(originalFilename: string, sizeSuffix: string): string {
  const lastDotIndex = originalFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalFilename}${sizeSuffix}`;
  }

  const name = originalFilename.substring(0, lastDotIndex);
  const ext = originalFilename.substring(lastDotIndex);
  return `${name}${sizeSuffix}${ext}`;
}

/**
 * Calculate size reduction percentage
 */
export function calculateSizeReduction(originalSize: number, newSize: number): number {
  return Math.round(((originalSize - newSize) / originalSize) * 100);
}
