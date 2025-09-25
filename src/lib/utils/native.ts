import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Geolocation, Position } from '@capacitor/geolocation'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Toast } from '@capacitor/toast'
import { Platform } from './platform'

export interface CameraOptions {
  quality?: number
  allowEditing?: boolean
  resultType?: 'uri' | 'base64'
  source?: 'camera' | 'photos' | 'prompt'
}

export interface LocationResult {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  speed?: number
  heading?: number
}

export interface ShareOptions {
  title?: string
  text?: string
  url?: string
  files?: string[]
}

/**
 * Native functionality wrapper that provides unified API across platforms
 */
export class Native {
  /**
   * Take a photo using native camera or file input
   */
  static async takePhoto(options: CameraOptions = {}): Promise<string> {
    const {
      quality = 90,
      allowEditing = false,
      resultType = 'uri',
      source = 'prompt'
    } = options

    if (Platform.isNative()) {
      try {
        const image = await Camera.getPhoto({
          quality,
          allowEditing,
          resultType: resultType === 'base64' ? CameraResultType.Base64 : CameraResultType.Uri,
          source: source === 'camera' ? CameraSource.Camera :
                 source === 'photos' ? CameraSource.Photos :
                 CameraSource.Prompt,
        })

        if (resultType === 'base64') {
          return `data:image/jpeg;base64,${image.base64String}`
        }

        return image.webPath || image.path || ''
      } catch (error) {
        console.error('Native camera error:', error)
        throw new Error(`Failed to take photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Web fallback - create file input
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        if (source === 'camera') {
          input.capture = 'environment'
        }

        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (file) {
            if (resultType === 'base64') {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = () => reject(new Error('Failed to read file'))
              reader.readAsDataURL(file)
            } else {
              resolve(URL.createObjectURL(file))
            }
          } else {
            reject(new Error('No file selected'))
          }
        }

        input.click()
      })
    }
  }

  /**
   * Get current location using native geolocation
   */
  static async getCurrentLocation(timeout: number = 10000): Promise<LocationResult> {
    if (Platform.isNative()) {
      try {
        const position: Position = await Geolocation.getCurrentPosition({
          timeout,
          enableHighAccuracy: true
        })

        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined
        }
      } catch (error) {
        console.error('Native geolocation error:', error)
        throw new Error('Failed to get location')
      }
    } else {
      // Web fallback
      return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation not supported'))
          return
        }

        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timeout'))
        }, timeout)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId)
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined
            })
          },
          (error) => {
            clearTimeout(timeoutId)
            reject(new Error(`Geolocation error: ${error.message}`))
          },
          {
            enableHighAccuracy: true,
            timeout,
            maximumAge: 300000 // 5 minutes
          }
        )
      })
    }
  }

  /**
   * Share content using native sharing
   */
  static async share(options: ShareOptions): Promise<void> {
    const { title, text, url, files } = options

    if (Platform.isNative()) {
      try {
        const shareData = {
          title,
          text,
          url,
        }

        if (files && files.length > 0) {
          // For Capacitor, files should be passed as URL strings
          await Share.share({
            ...shareData,
            files: files
          })
        } else {
          await Share.share(shareData)
        }
      } catch (error) {
        console.error('Native share error:', error)
        throw new Error('Failed to share content')
      }
    } else {
      // Web fallback
      if ('share' in navigator && navigator.share) {
        try {
          await navigator.share({
            title,
            text,
            url,
            files: files?.map(file => new File([], file)) // Simplified for web
          })
        } catch {
          // User cancelled or error occurred
          throw new Error('Failed to share content')
        }
      } else {
        // Fallback to clipboard
        const shareText = [title, text, url].filter(Boolean).join(' - ')
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText)
          await Native.showToast('Copied to clipboard')
        } else {
          // Last resort - legacy clipboard
          const textArea = document.createElement('textarea')
          textArea.value = shareText
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          await Native.showToast('Copied to clipboard')
        }
      }
    }
  }

  /**
   * Show toast notification
   */
  static async showToast(message: string, duration: 'short' | 'long' = 'short'): Promise<void> {
    if (Platform.isNative()) {
      try {
        await Toast.show({
          text: message,
          duration: duration === 'short' ? 'short' : 'long'
        })
      } catch (error) {
        console.error('Native toast error:', error)
        // Fallback to alert
        alert(message)
      }
    } else {
      // Web fallback - could integrate with Sonner toast library that's already in the project
      console.info('Toast:', message)

      // Create a simple toast notification for web
      const toast = document.createElement('div')
      toast.textContent = message
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: opacity 0.3s ease;
      `

      document.body.appendChild(toast)

      const timeout = duration === 'short' ? 2000 : 3500
      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast)
          }
        }, 300)
      }, timeout)
    }
  }

  /**
   * Save data to native filesystem
   */
  static async saveFile(
    path: string,
    data: string,
    options: { directory?: Directory; encoding?: Encoding } = {}
  ): Promise<string> {
    const { directory = Directory.Documents, encoding = Encoding.UTF8 } = options

    if (Platform.isNative()) {
      try {
        const result = await Filesystem.writeFile({
          path,
          data,
          directory,
          encoding
        })
        return result.uri
      } catch (error) {
        console.error('Native filesystem error:', error)
        throw new Error('Failed to save file')
      }
    } else {
      // Web fallback - save to downloads
      const blob = new Blob([data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = path
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
      return path
    }
  }

  /**
   * Read file from native filesystem
   */
  static async readFile(
    path: string,
    options: { directory?: Directory; encoding?: Encoding } = {}
  ): Promise<string> {
    const { directory = Directory.Documents, encoding = Encoding.UTF8 } = options

    if (Platform.isNative()) {
      try {
        const result = await Filesystem.readFile({
          path,
          directory,
          encoding
        })
        return result.data as string
      } catch (error) {
        console.error('Native filesystem read error:', error)
        throw new Error('Failed to read file')
      }
    } else {
      throw new Error('File reading not supported on web platform')
    }
  }

  /**
   * Check and request permissions
   */
  static async requestPermissions(permissions: ('camera' | 'geolocation')[]): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {}

    if (Platform.isNative()) {
      for (const permission of permissions) {
        try {
          if (permission === 'camera') {
            const result = await Camera.requestPermissions()
            results.camera = result.camera === 'granted' || result.photos === 'granted'
          } else if (permission === 'geolocation') {
            const result = await Geolocation.requestPermissions()
            results.geolocation = result.location === 'granted'
          }
        } catch (error) {
          console.error(`Permission request failed for ${permission}:`, error)
          results[permission] = false
        }
      }
    } else {
      // Web - permissions are usually requested automatically
      for (const permission of permissions) {
        results[permission] = Platform.isCapabilityAvailable(permission)
      }
    }

    return results
  }
}

/**
 * React hook for native functionality
 */
export const useNative = () => {
  return {
    takePhoto: Native.takePhoto,
    getCurrentLocation: Native.getCurrentLocation,
    share: Native.share,
    showToast: Native.showToast,
    saveFile: Native.saveFile,
    readFile: Native.readFile,
    requestPermissions: Native.requestPermissions,
    platform: Platform.getInfo()
  }
}