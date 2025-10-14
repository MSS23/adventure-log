/**
 * Capacitor Camera Integration
 *
 * Unified camera interface for taking photos and selecting from gallery
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Toast } from '@capacitor/toast'
import { Capacitor } from '@capacitor/core'
import { log } from '@/lib/utils/logger'

export interface CameraOptions {
  source?: CameraSource
  quality?: number
  allowEditing?: boolean
  resultType?: CameraResultType
  saveToGallery?: boolean
  correctOrientation?: boolean
  width?: number
  height?: number
}

const DEFAULT_OPTIONS: CameraOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri,
  saveToGallery: false,
  correctOrientation: true
}

/**
 * Check if running in native app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check camera permissions
 */
export async function checkCameraPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    return true // Web doesn't need special permissions
  }

  try {
    const permissions = await Camera.checkPermissions()
    return permissions.camera === 'granted' && permissions.photos === 'granted'
  } catch (error) {
    log.error('Error checking camera permissions', { error })
    return false
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    return true
  }

  try {
    const permissions = await Camera.requestPermissions()
    return permissions.camera === 'granted' && permissions.photos === 'granted'
  } catch (error) {
    log.error('Error requesting camera permissions', { error })
    return false
  }
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(options: CameraOptions = {}): Promise<File | null> {
  const hasPermission = await checkCameraPermissions()

  if (!hasPermission) {
    const granted = await requestCameraPermissions()
    if (!granted) {
      await Toast.show({
        text: 'Camera permission is required to take photos',
        duration: 'long',
        position: 'bottom'
      })
      return null
    }
  }

  try {
    const photo = await Camera.getPhoto({
      quality: options.quality || DEFAULT_OPTIONS.quality!,
      allowEditing: options.allowEditing ?? DEFAULT_OPTIONS.allowEditing!,
      resultType: options.resultType || DEFAULT_OPTIONS.resultType!,
      source: CameraSource.Camera,
      saveToGallery: options.saveToGallery ?? DEFAULT_OPTIONS.saveToGallery!,
      correctOrientation: options.correctOrientation ?? DEFAULT_OPTIONS.correctOrientation!,
      width: options.width,
      height: options.height
    })

    return await photoToFile(photo)
  } catch (error) {
    log.error('Error taking photo', { error })
    await Toast.show({
      text: 'Failed to take photo',
      duration: 'short',
      position: 'bottom'
    })
    return null
  }
}

/**
 * Select photo(s) from gallery
 */
export async function selectFromGallery(
  options: CameraOptions = {},
  multiple: boolean = false
): Promise<File[]> {
  const hasPermission = await checkCameraPermissions()

  if (!hasPermission) {
    const granted = await requestCameraPermissions()
    if (!granted) {
      await Toast.show({
        text: 'Gallery access permission is required',
        duration: 'long',
        position: 'bottom'
      })
      return []
    }
  }

  try {
    if (multiple && isNativeApp()) {
      // For multiple photos, we need to use different approach
      const photos = await Camera.pickImages({
        quality: options.quality || 90,
        limit: 10 // Max 10 photos at once
      })

      const files: File[] = []
      for (const photo of photos.photos) {
        const file = await photoToFile(photo as Photo)
        if (file) {
          files.push(file)
        }
      }
      return files
    } else {
      // Single photo
      const photo = await Camera.getPhoto({
        quality: options.quality || DEFAULT_OPTIONS.quality!,
        allowEditing: options.allowEditing ?? DEFAULT_OPTIONS.allowEditing!,
        resultType: options.resultType || DEFAULT_OPTIONS.resultType!,
        source: CameraSource.Photos,
        saveToGallery: options.saveToGallery ?? DEFAULT_OPTIONS.saveToGallery!,
        correctOrientation: options.correctOrientation ?? DEFAULT_OPTIONS.correctOrientation!,
        width: options.width,
        height: options.height
      })

      const file = await photoToFile(photo)
      return file ? [file] : []
    }
  } catch (error) {
    log.error('Error selecting from gallery', { error })
    await Toast.show({
      text: 'Failed to select photo',
      duration: 'short',
      position: 'bottom'
    })
    return []
  }
}

/**
 * Convert Capacitor Photo to File object
 */
async function photoToFile(photo: Photo): Promise<File | null> {
  try {
    if (!photo.path) {
      return null
    }

    // For native platforms, read the file
    if (isNativeApp()) {
      const fileData = await Filesystem.readFile({
        path: photo.path
      })

      // Convert base64 to blob
      const response = await fetch(`data:${photo.format};base64,${fileData.data}`)
      const blob = await response.blob()

      // Create File object
      const fileName = photo.path.split('/').pop() || `photo-${Date.now()}.${photo.format}`
      return new File([blob], fileName, { type: `image/${photo.format}` })
    } else {
      // For web, fetch the URI
      const response = await fetch(photo.webPath!)
      const blob = await response.blob()
      const fileName = `photo-${Date.now()}.${photo.format || 'jpg'}`
      return new File([blob], fileName, { type: `image/${photo.format || 'jpeg'}` })
    }
  } catch (error) {
    log.error('Error converting photo to file', { error })
    return null
  }
}

/**
 * Save photo to device gallery
 */
export async function savePhotoToGallery(imageData: string, fileName: string): Promise<boolean> {
  if (!isNativeApp()) {
    // Web fallback - trigger download
    const link = document.createElement('a')
    link.href = imageData
    link.download = fileName
    link.click()
    return true
  }

  try {
    await Filesystem.writeFile({
      path: `Downloads/${fileName}`,
      data: imageData,
      directory: Directory.External
    })

    await Toast.show({
      text: 'Photo saved to gallery',
      duration: 'short',
      position: 'bottom'
    })

    return true
  } catch (error) {
    log.error('Error saving photo to gallery', { error })
    await Toast.show({
      text: 'Failed to save photo',
      duration: 'short',
      position: 'bottom'
    })
    return false
  }
}

/**
 * Delete photo from filesystem
 */
export async function deletePhoto(filePath: string): Promise<boolean> {
  if (!isNativeApp()) {
    return true // No action needed for web
  }

  try {
    await Filesystem.deleteFile({
      path: filePath
    })
    return true
  } catch (error) {
    log.error('Error deleting photo', { error, filePath })
    return false
  }
}
