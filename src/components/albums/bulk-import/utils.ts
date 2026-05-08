import type { ProcessedPhoto, PhotoGroup } from './types'

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function computeGroupCenter(photos: ProcessedPhoto[]): { lat: number | null; lng: number | null } {
  const withCoords = photos.filter(p => p.lat !== null && p.lng !== null)
  if (withCoords.length === 0) return { lat: null, lng: null }
  const sumLat = withCoords.reduce((s, p) => s + p.lat!, 0)
  const sumLng = withCoords.reduce((s, p) => s + p.lng!, 0)
  return {
    lat: sumLat / withCoords.length,
    lng: sumLng / withCoords.length,
  }
}

export function computeDateRange(photos: ProcessedPhoto[]): { start: Date | null; end: Date | null } {
  const withDates = photos.filter(p => p.date !== null).map(p => p.date!.getTime())
  if (withDates.length === 0) return { start: null, end: null }
  return {
    start: new Date(Math.min(...withDates)),
    end: new Date(Math.max(...withDates)),
  }
}

export function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return 'Unknown dates'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', opts)
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function groupPhotosByTrip(photos: ProcessedPhoto[]): PhotoGroup[] {
  // Separate photos with and without location/date data
  const withData = photos.filter(p => p.date !== null)
  const withoutData = photos.filter(p => p.date === null)

  // Sort by date
  const sorted = [...withData].sort((a, b) => a.date!.getTime() - b.date!.getTime())

  const groups: PhotoGroup[] = []
  let currentGroupPhotos: ProcessedPhoto[] = []

  for (const photo of sorted) {
    if (currentGroupPhotos.length === 0) {
      currentGroupPhotos.push(photo)
      continue
    }

    const lastPhoto = currentGroupPhotos[currentGroupPhotos.length - 1]
    const daysDiff = (photo.date!.getTime() - lastPhoto.date!.getTime()) / (1000 * 60 * 60 * 24)

    // Check distance if both have coordinates
    let distanceKm = 0
    if (lastPhoto.lat !== null && lastPhoto.lng !== null && photo.lat !== null && photo.lng !== null) {
      distanceKm = haversineDistance(lastPhoto.lat, lastPhoto.lng, photo.lat, photo.lng)
    }

    // New group if more than 3 days gap OR more than 200km apart
    if (daysDiff > 3 || (distanceKm > 200 && lastPhoto.lat !== null)) {
      const center = computeGroupCenter(currentGroupPhotos)
      const range = computeDateRange(currentGroupPhotos)
      groups.push({
        id: generateGroupId(),
        name: '',
        photos: currentGroupPhotos,
        centerLat: center.lat,
        centerLng: center.lng,
        dateStart: range.start,
        dateEnd: range.end,
        locationName: 'Loading...',
        expanded: true,
      })
      currentGroupPhotos = [photo]
    } else {
      currentGroupPhotos.push(photo)
    }
  }

  // Push last group
  if (currentGroupPhotos.length > 0) {
    const center = computeGroupCenter(currentGroupPhotos)
    const range = computeDateRange(currentGroupPhotos)
    groups.push({
      id: generateGroupId(),
      name: '',
      photos: currentGroupPhotos,
      centerLat: center.lat,
      centerLng: center.lng,
      dateStart: range.start,
      dateEnd: range.end,
      locationName: 'Loading...',
      expanded: true,
    })
  }

  // Add "No location/date" group
  if (withoutData.length > 0) {
    groups.push({
      id: generateGroupId(),
      name: 'Ungrouped Photos',
      photos: withoutData,
      centerLat: null,
      centerLng: null,
      dateStart: null,
      dateEnd: null,
      locationName: 'No location data',
      expanded: true,
    })
  }

  return groups
}
