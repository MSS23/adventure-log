import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateImageSizes, generateSizedFilename, calculateSizeReduction, IMAGE_SIZES } from '@/lib/utils/image-processing';
import { log } from '@/lib/utils/logger';

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadedPhoto {
  originalPath: string;
  thumbnailPath?: string;
  mediumPath?: string;
  largePath?: string;
  originalSize: number;
  totalSize: number;
  sizeReduction: number;
}

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const supabase = createClient();

  const uploadPhoto = async (
    file: File,
    albumId: string,
    userId: string,
    generateThumbnails: boolean = true
  ): Promise<UploadedPhoto | null> => {
    const fileId = `${Date.now()}-${file.name}`;

    try {
      setProgress(prev => ({
        ...prev,
        [fileId]: {
          filename: file.name,
          progress: 0,
          status: 'uploading',
        },
      }));

      const fileExt = file.name.split('.').pop();
      const baseFileName = `${albumId}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const originalPath = `${baseFileName}.${fileExt}`;

      let thumbnailPath: string | undefined;
      let mediumPath: string | undefined;
      let largePath: string | undefined;
      let totalSize = file.size;

      if (generateThumbnails) {
        // Generate multiple sizes
        const sizes = await generateImageSizes(file);

        // Upload thumbnail
        if (sizes.thumbnail) {
          thumbnailPath = `${baseFileName}${IMAGE_SIZES.thumbnail.suffix}.jpg`;
          await supabase.storage
            .from('photos')
            .upload(thumbnailPath, sizes.thumbnail.blob, {
              cacheControl: '31536000', // 1 year
              upsert: false,
            });
          totalSize += sizes.thumbnail.size;
        }

        // Upload medium
        if (sizes.medium) {
          mediumPath = `${baseFileName}${IMAGE_SIZES.medium.suffix}.jpg`;
          await supabase.storage
            .from('photos')
            .upload(mediumPath, sizes.medium.blob, {
              cacheControl: '31536000',
              upsert: false,
            });
          totalSize += sizes.medium.size;
        }

        // Upload large
        if (sizes.large) {
          largePath = `${baseFileName}${IMAGE_SIZES.large.suffix}.jpg`;
          await supabase.storage
            .from('photos')
            .upload(largePath, sizes.large.blob, {
              cacheControl: '31536000',
              upsert: false,
            });
          totalSize += sizes.large.size;
        }

        setProgress(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 70,
          },
        }));
      }

      // Upload original
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(originalPath, file, {
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          progress: 100,
          status: 'completed',
        },
      }));

      const sizeReduction = generateThumbnails
        ? calculateSizeReduction(file.size * 4, totalSize) // Rough estimate
        : 0;

      log.info('Photo uploaded successfully', {
        component: 'usePhotoUpload',
        filename: file.name,
        originalSize: file.size,
        totalSize,
        sizeReduction: `${sizeReduction}%`,
      });

      return {
        originalPath,
        thumbnailPath,
        mediumPath,
        largePath,
        originalSize: file.size,
        totalSize,
        sizeReduction,
      };
    } catch (error) {
      log.error('Photo upload failed', {
        component: 'usePhotoUpload',
        filename: file.name,
      }, error as Error);

      setProgress(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        },
      }));

      return null;
    }
  };

  const uploadMultiple = async (
    files: File[],
    albumId: string,
    userId: string,
    generateThumbnails: boolean = true
  ): Promise<UploadedPhoto[]> => {
    setUploading(true);

    const results: UploadedPhoto[] = [];

    for (const file of files) {
      const result = await uploadPhoto(file, albumId, userId, generateThumbnails);
      if (result) {
        results.push(result);
      }
    }

    setUploading(false);

    return results;
  };

  const clearProgress = () => {
    setProgress({});
  };

  return {
    uploadPhoto,
    uploadMultiple,
    uploading,
    progress,
    clearProgress,
  };
}
