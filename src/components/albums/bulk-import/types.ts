import type { ExifData } from '@/lib/utils/exif-extraction'

export interface ProcessedPhoto {
  id: string
  file: File
  preview: string
  lat: number | null
  lng: number | null
  date: Date | null
  exif: ExifData | null
  locationName?: string
}

export interface PhotoGroup {
  id: string
  name: string
  photos: ProcessedPhoto[]
  centerLat: number | null
  centerLng: number | null
  dateStart: Date | null
  dateEnd: Date | null
  locationName: string
  expanded: boolean
}

export type Stage = 'dropzone' | 'processing' | 'review' | 'uploading' | 'complete'
