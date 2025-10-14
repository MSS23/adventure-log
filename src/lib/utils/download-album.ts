import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Photo } from '@/types/database'
import { getPhotoUrl } from './photo-url'
import { log } from './logger'

export interface DownloadProgress {
  current: number
  total: number
  percentage: number
  currentFile?: string
  status: 'preparing' | 'downloading' | 'compressing' | 'complete' | 'error'
}

export async function downloadAlbumPhotos(
  photos: Photo[],
  albumTitle: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  if (photos.length === 0) {
    throw new Error('No photos to download')
  }

  const zip = new JSZip()
  const total = photos.length
  let downloaded = 0

  try {
    // Preparing phase
    onProgress?.({
      current: 0,
      total,
      percentage: 0,
      status: 'preparing'
    })

    // Download each photo
    for (const photo of photos) {
      try {
        const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
        if (!photoUrl) {
          log.warn('Skipping photo without URL', {
            component: 'downloadAlbumPhotos',
            photoId: photo.id
          })
          continue
        }

        onProgress?.({
          current: downloaded,
          total,
          percentage: Math.round((downloaded / total) * 100),
          currentFile: photo.caption || photo.file_path || 'photo',
          status: 'downloading'
        })

        // Fetch photo
        const response = await fetch(photoUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch photo: ${response.statusText}`)
        }

        const blob = await response.blob()

        // Generate filename
        const extension = photo.file_path?.split('.').pop() || 'jpg'
        const baseFilename = photo.caption
          ? sanitizeFilename(photo.caption)
          : `photo_${downloaded + 1}`
        const filename = `${baseFilename}.${extension}`

        // Add to zip
        zip.file(filename, blob)

        downloaded++
      } catch (error) {
        log.error('Failed to download photo', {
          component: 'downloadAlbumPhotos',
          photoId: photo.id
        }, error instanceof Error ? error : new Error(String(error)))
        // Continue with next photo
      }
    }

    if (downloaded === 0) {
      throw new Error('Failed to download any photos')
    }

    // Compressing phase
    onProgress?.({
      current: downloaded,
      total,
      percentage: 90,
      status: 'compressing'
    })

    // Generate and download zip
    const zipFilename = `${sanitizeFilename(albumTitle)}_${Date.now()}.zip`
    const zipBlob = await zip.generateAsync(
      { type: 'blob' },
      (metadata) => {
        onProgress?.({
          current: downloaded,
          total,
          percentage: 90 + Math.round(metadata.percent / 10),
          status: 'compressing'
        })
      }
    )

    // Save file
    saveAs(zipBlob, zipFilename)

    // Complete
    onProgress?.({
      current: total,
      total,
      percentage: 100,
      status: 'complete'
    })

    log.info('Album downloaded successfully', {
      component: 'downloadAlbumPhotos',
      photoCount: downloaded,
      totalPhotos: total
    })
  } catch (error) {
    log.error('Album download failed', {
      component: 'downloadAlbumPhotos',
      totalPhotos: total,
      downloaded
    }, error instanceof Error ? error : new Error(String(error)))

    onProgress?.({
      current: downloaded,
      total,
      percentage: 0,
      status: 'error'
    })

    throw error
  }
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9-_\s]/gi, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 100) // Limit filename length
}

export async function downloadSinglePhoto(photo: Photo): Promise<void> {
  const photoUrl = getPhotoUrl(photo.file_path || photo.storage_path)
  if (!photoUrl) {
    throw new Error('Photo URL not available')
  }

  try {
    const response = await fetch(photoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch photo: ${response.statusText}`)
    }

    const blob = await response.blob()

    const extension = photo.file_path?.split('.').pop() || 'jpg'
    const filename = photo.caption
      ? `${sanitizeFilename(photo.caption)}.${extension}`
      : `photo_${photo.id}.${extension}`

    saveAs(blob, filename)

    log.info('Photo downloaded successfully', {
      component: 'downloadSinglePhoto',
      photoId: photo.id
    })
  } catch (error) {
    log.error('Photo download failed', {
      component: 'downloadSinglePhoto',
      photoId: photo.id
    }, error instanceof Error ? error : new Error(String(error)))

    throw error
  }
}
