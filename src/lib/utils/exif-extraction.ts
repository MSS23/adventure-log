'use client'

import { log } from '@/lib/utils/logger'

export interface ExifLocationData {
  latitude?: number
  longitude?: number
  altitude?: number
  heading?: number
  accuracy?: number
}

export interface ExifCameraData {
  make?: string
  model?: string
  lens?: string
  focalLength?: number
  aperture?: number
  iso?: number
  shutterSpeed?: string
}

export interface ExifDateTimeData {
  dateTime?: string
  dateTimeOriginal?: string
  dateTimeDigitized?: string
  offsetTime?: string
  timeZone?: string
}

export interface ExifData {
  location?: ExifLocationData
  camera?: ExifCameraData
  dateTime?: ExifDateTimeData
  orientation?: number
  software?: string
  colorSpace?: string
  whiteBalance?: string
}

interface ExifExtractionOptions {
  timeout?: number
  fallbackEnabled?: boolean
  validateCoordinates?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

const DEFAULT_OPTIONS: ExifExtractionOptions = {
  timeout: 8000, // Increased timeout for complex images
  fallbackEnabled: true,
  validateCoordinates: true,
  logLevel: 'debug'
}

/**
 * Enhanced EXIF data extraction with improved GPS coordinate handling
 * and multiple fallback strategies
 */
export class ExifExtractor {
  private options: ExifExtractionOptions

  constructor(options: Partial<ExifExtractionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Extract comprehensive EXIF data from a file
   */
  async extractExifData(file: File): Promise<ExifData> {
    const startTime = Date.now()

    log.debug('Starting enhanced EXIF extraction', {
      component: 'ExifExtractor',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      // Primary extraction using exifr
      const primaryResult = await this.extractWithExifr(file)

      if (this.hasValidLocationData(primaryResult?.location)) {
        log.info('EXIF extraction successful with primary method', {
          component: 'ExifExtractor',
          fileName: file.name,
          duration: Date.now() - startTime,
          hasLocation: true
        })
        return primaryResult
      }

      // Fallback extraction methods if primary fails or lacks location
      if (this.options.fallbackEnabled) {
        const fallbackResult = await this.extractWithFallbacks(file)

        if (fallbackResult && this.hasValidLocationData(fallbackResult.location)) {
          log.info('EXIF extraction successful with fallback method', {
            component: 'ExifExtractor',
            fileName: file.name,
            duration: Date.now() - startTime,
            hasLocation: true
          })
          return fallbackResult
        }
      }

      // Return primary result even if no location data
      log.warn('EXIF extraction completed without location data', {
        component: 'ExifExtractor',
        fileName: file.name,
        duration: Date.now() - startTime,
        hasLocation: false
      })

      return primaryResult || {}

    } catch (error) {
      log.error('EXIF extraction failed completely', {
        component: 'ExifExtractor',
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      })

      return {}
    }
  }

  /**
   * Primary EXIF extraction using exifr library
   */
  private async extractWithExifr(file: File): Promise<ExifData> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('EXIF extraction timeout')), this.options.timeout)
      })

      // Dynamic import to avoid SSR issues
      const exifr = await import('exifr')

      // Extract comprehensive EXIF data
      const rawExif = await Promise.race([
        exifr.parse(file, {
          gps: true,
          pick: [
            'GPS*', 'DateTime*', 'Make', 'Model', 'LensModel',
            'FocalLength', 'FNumber', 'ISO', 'ShutterSpeedValue',
            'ExposureTime', 'Orientation', 'Software', 'ColorSpace',
            'WhiteBalance', 'GPSAltitude*', 'GPSImgDirection*'
          ]
        }),
        timeoutPromise
      ])

      return this.parseExifData(rawExif)

    } catch (error) {
      log.debug('Primary EXIF extraction failed', {
        component: 'ExifExtractor',
        method: 'exifr',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Fallback extraction methods using alternative approaches
   */
  private async extractWithFallbacks(file: File): Promise<ExifData | null> {
    const fallbackMethods = [
      () => this.extractWithFileReader(file),
      () => this.extractWithCanvas(file)
    ]

    for (const method of fallbackMethods) {
      try {
        const result = await method()
        if (result && this.hasValidLocationData(result.location)) {
          return result
        }
      } catch (error) {
        log.debug('Fallback extraction method failed', {
          component: 'ExifExtractor',
          error: error instanceof Error ? error.message : String(error)
        })
        continue
      }
    }

    return null
  }

  /**
   * Alternative extraction using FileReader for binary EXIF parsing
   */
  private async extractWithFileReader(file: File): Promise<ExifData | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = () => {
        try {
          const result = this.parseExifFromBuffer()
          resolve(result)
        } catch {
          resolve(null)
        }
      }

      reader.onerror = () => resolve(null)
      reader.readAsArrayBuffer(file.slice(0, 128 * 1024)) // Read first 128KB
    })
  }

  /**
   * Canvas-based extraction for images
   */
  private async extractWithCanvas(file: File): Promise<ExifData | null> {
    if (!file.type.startsWith('image/')) return null

    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        try {
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)

          // Extract basic metadata if available
          resolve({
            // Basic image properties only - canvas doesn't provide EXIF
          })
        } catch {
          resolve(null)
        }
      }

      img.onerror = () => resolve(null)
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Parse raw EXIF data into structured format
   */
  private parseExifData(rawExif: Record<string, unknown>): ExifData {
    if (!rawExif) return {}

    const exifData: ExifData = {}

    // Location data
    if (rawExif.latitude || rawExif.longitude || rawExif.GPSLatitude || rawExif.GPSLongitude) {
      exifData.location = {
        latitude: (rawExif.latitude || rawExif.GPSLatitude) as number | undefined,
        longitude: (rawExif.longitude || rawExif.GPSLongitude) as number | undefined,
        altitude: (rawExif.GPSAltitude || rawExif.altitude) as number | undefined,
        heading: (rawExif.GPSImgDirection || rawExif.GPSImgDirectionRef) as number | undefined,
        accuracy: (rawExif.GPSDOP || rawExif.GPSHPositioningError) as number | undefined
      }

      // Validate coordinates
      if (this.options.validateCoordinates) {
        exifData.location = this.validateCoordinates(exifData.location)
      }
    }

    // Camera data
    exifData.camera = {
      make: rawExif.Make as string | undefined,
      model: rawExif.Model as string | undefined,
      lens: (rawExif.LensModel || rawExif.LensMake) as string | undefined,
      focalLength: rawExif.FocalLength as number | undefined,
      aperture: (rawExif.FNumber || rawExif.ApertureValue) as number | undefined,
      iso: (rawExif.ISO || rawExif.ISOSpeedRatings) as number | undefined,
      shutterSpeed: (rawExif.ExposureTime || rawExif.ShutterSpeedValue) as string | undefined
    }

    // DateTime data
    exifData.dateTime = {
      dateTime: rawExif.DateTime as string | undefined,
      dateTimeOriginal: rawExif.DateTimeOriginal as string | undefined,
      dateTimeDigitized: rawExif.DateTimeDigitized as string | undefined,
      offsetTime: (rawExif.OffsetTime || rawExif.OffsetTimeOriginal) as string | undefined,
      timeZone: rawExif.TimeZone as string | undefined
    }

    // Other metadata
    exifData.orientation = rawExif.Orientation as number | undefined
    exifData.software = rawExif.Software as string | undefined
    exifData.colorSpace = rawExif.ColorSpace as string | undefined
    exifData.whiteBalance = rawExif.WhiteBalance as string | undefined

    return exifData
  }

  /**
   * Basic binary EXIF parsing (simplified implementation)
   */
  private parseExifFromBuffer(): ExifData | null {
    // This is a simplified implementation
    // In a full implementation, you would parse the EXIF binary structure
    // For now, we'll return null to indicate this method needs more work
    return null
  }

  /**
   * Validate and sanitize coordinate data
   */
  private validateCoordinates(location: ExifLocationData): ExifLocationData {
    const validated = { ...location }

    // Validate latitude
    if (validated.latitude !== undefined) {
      if (validated.latitude < -90 || validated.latitude > 90) {
        log.warn('Invalid latitude detected, removing from EXIF data', {
          component: 'ExifExtractor',
          latitude: validated.latitude
        })
        delete validated.latitude
      }
    }

    // Validate longitude
    if (validated.longitude !== undefined) {
      if (validated.longitude < -180 || validated.longitude > 180) {
        log.warn('Invalid longitude detected, removing from EXIF data', {
          component: 'ExifExtractor',
          longitude: validated.longitude
        })
        delete validated.longitude
      }
    }

    // Validate altitude (reasonable range: -500m to 10,000m)
    if (validated.altitude !== undefined) {
      if (validated.altitude < -500 || validated.altitude > 10000) {
        log.warn('Suspicious altitude detected', {
          component: 'ExifExtractor',
          altitude: validated.altitude
        })
        // Don't delete, but log warning
      }
    }

    return validated
  }

  /**
   * Check if location data is valid and usable
   */
  private hasValidLocationData(location?: ExifLocationData): boolean {
    return !!(
      location?.latitude &&
      location?.longitude &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude) &&
      location.latitude !== 0 &&
      location.longitude !== 0
    )
  }
}

/**
 * Convenience function for quick EXIF extraction
 */
export async function extractPhotoExif(
  file: File,
  options?: Partial<ExifExtractionOptions>
): Promise<ExifData> {
  const extractor = new ExifExtractor(options)
  return extractor.extractExifData(file)
}

/**
 * Extract only location data from a photo
 */
export async function extractPhotoLocation(
  file: File,
  options?: Partial<ExifExtractionOptions>
): Promise<ExifLocationData | null> {
  const exifData = await extractPhotoExif(file, options)
  return exifData.location || null
}

/**
 * Batch process multiple files for EXIF data
 */
export async function batchExtractExif(
  files: File[],
  options?: Partial<ExifExtractionOptions>
): Promise<Array<{ file: File; exif: ExifData; error?: string }>> {
  const results = []
  const extractor = new ExifExtractor(options)

  for (const file of files) {
    try {
      const exif = await extractor.extractExifData(file)
      results.push({ file, exif })
    } catch (error) {
      results.push({
        file,
        exif: {},
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return results
}

// Legacy compatibility export
export { extractPhotoExif as extractExifData }