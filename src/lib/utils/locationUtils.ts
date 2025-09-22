// Location validation and formatting utilities

export interface LocationData {
  latitude: number
  longitude: number
  display_name: string
  place_id?: string
  city_id?: number
  country_id?: number
}

export interface LocationValidationResult {
  isValid: boolean
  errors: string[]
}

export interface PopularDestination {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  airport_code?: string
  city_type: 'capital' | 'city' | 'island'
  region: string
}

/**
 * Validates latitude and longitude coordinates
 */
export function validateCoordinates(latitude: number, longitude: number): LocationValidationResult {
  const errors: string[] = []

  // Validate latitude
  if (latitude < -90 || latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees')
  }

  // Validate longitude
  if (longitude < -180 || longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees')
  }

  // Check for common invalid coordinates
  if (latitude === 0 && longitude === 0) {
    errors.push('Coordinates cannot be at null island (0, 0)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates location data object
 */
export function validateLocationData(location: LocationData | null): LocationValidationResult {
  if (!location) {
    return {
      isValid: false,
      errors: ['Location data is required']
    }
  }

  const errors: string[] = []

  // Validate required fields
  if (!location.display_name || location.display_name.trim().length === 0) {
    errors.push('Location name is required')
  }

  // Validate coordinates
  const coordValidation = validateCoordinates(location.latitude, location.longitude)
  errors.push(...coordValidation.errors)

  // Validate display name length
  if (location.display_name && location.display_name.length > 500) {
    errors.push('Location name is too long (maximum 500 characters)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 6
): string {
  const latDir = latitude >= 0 ? 'N' : 'S'
  const lngDir = longitude >= 0 ? 'E' : 'W'

  const latAbs = Math.abs(latitude).toFixed(precision)
  const lngAbs = Math.abs(longitude).toFixed(precision)

  return `${latAbs}°${latDir}, ${lngAbs}°${lngDir}`
}

/**
 * Formats coordinates for technical display (decimal degrees)
 */
export function formatCoordinatesDecimal(
  latitude: number,
  longitude: number,
  precision: number = 6
): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
}

/**
 * Formats location name for consistent display
 */
export function formatLocationName(locationName: string, maxLength: number = 60): string {
  if (!locationName) return ''

  // Trim whitespace
  const trimmed = locationName.trim()

  // Truncate if too long
  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return trimmed.substring(0, maxLength - 3) + '...'
}

/**
 * Extracts country from location display name
 */
export function extractCountryFromDisplayName(displayName: string): string | null {
  if (!displayName) return null

  // Split by comma and get the last part (usually country)
  const parts = displayName.split(',').map(part => part.trim())

  if (parts.length >= 2) {
    return parts[parts.length - 1]
  }

  return null
}

/**
 * Extracts city from location display name
 */
export function extractCityFromDisplayName(displayName: string): string | null {
  if (!displayName) return null

  // Split by comma and get the first part (usually city)
  const parts = displayName.split(',').map(part => part.trim())

  if (parts.length >= 1) {
    return parts[0]
  }

  return null
}

/**
 * Calculates distance between two locations using Haversine formula
 */
export function calculateDistance(
  location1: LocationData,
  location2: LocationData
): number {
  const R = 6371 // Earth's radius in kilometers

  const lat1Rad = (location1.latitude * Math.PI) / 180
  const lat2Rad = (location2.latitude * Math.PI) / 180
  const deltaLatRad = ((location2.latitude - location1.latitude) * Math.PI) / 180
  const deltaLngRad = ((location2.longitude - location1.longitude) * Math.PI) / 180

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Formats distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`
  } else {
    return `${Math.round(distanceKm)}km`
  }
}

/**
 * Determines region for a country code
 */
export function getRegionForCountryCode(countryCode: string): string {
  const countryRegions: Record<string, string> = {
    // Europe
    'AD': 'Europe', 'AL': 'Europe', 'AT': 'Europe', 'BA': 'Europe', 'BE': 'Europe',
    'BG': 'Europe', 'BY': 'Europe', 'CH': 'Europe', 'CZ': 'Europe', 'DE': 'Europe',
    'DK': 'Europe', 'EE': 'Europe', 'ES': 'Europe', 'FI': 'Europe', 'FR': 'Europe',
    'GB': 'Europe', 'GR': 'Europe', 'HR': 'Europe', 'HU': 'Europe', 'IE': 'Europe',
    'IS': 'Europe', 'IT': 'Europe', 'LI': 'Europe', 'LT': 'Europe', 'LU': 'Europe',
    'LV': 'Europe', 'MC': 'Europe', 'MD': 'Europe', 'ME': 'Europe', 'MK': 'Europe',
    'MT': 'Europe', 'NL': 'Europe', 'NO': 'Europe', 'PL': 'Europe', 'PT': 'Europe',
    'RO': 'Europe', 'RS': 'Europe', 'RU': 'Europe', 'SE': 'Europe', 'SI': 'Europe',
    'SK': 'Europe', 'SM': 'Europe', 'TR': 'Europe', 'UA': 'Europe', 'VA': 'Europe',

    // Asia
    'AF': 'Asia', 'AM': 'Asia', 'AZ': 'Asia', 'BD': 'Asia',
    'BN': 'Asia', 'BT': 'Asia', 'CN': 'Asia', 'GE': 'Asia', 'ID': 'Asia',
    'IL': 'Asia', 'IN': 'Asia', 'IQ': 'Asia', 'IR': 'Asia', 'JO': 'Asia',
    'JP': 'Asia', 'KG': 'Asia', 'KH': 'Asia', 'KP': 'Asia', 'KR': 'Asia',
    'KZ': 'Asia', 'LA': 'Asia', 'LB': 'Asia', 'LK': 'Asia',
    'MM': 'Asia', 'MN': 'Asia', 'MV': 'Asia', 'MY': 'Asia', 'NP': 'Asia',
    'PH': 'Asia', 'PK': 'Asia', 'PS': 'Asia',
    'SG': 'Asia', 'SY': 'Asia', 'TH': 'Asia', 'TJ': 'Asia',
    'TL': 'Asia', 'TM': 'Asia', 'UZ': 'Asia', 'VN': 'Asia', 'YE': 'Asia',

    // North America
    'CA': 'North America', 'US': 'North America', 'MX': 'North America',
    'BZ': 'North America', 'CR': 'North America', 'CU': 'North America',
    'DO': 'North America', 'GT': 'North America', 'HN': 'North America',
    'HT': 'North America', 'JM': 'North America', 'NI': 'North America',
    'PA': 'North America', 'SV': 'North America', 'TT': 'North America',

    // South America
    'AR': 'South America', 'BO': 'South America', 'BR': 'South America',
    'CL': 'South America', 'CO': 'South America', 'EC': 'South America',
    'FK': 'South America', 'GF': 'South America', 'GY': 'South America',
    'PE': 'South America', 'PY': 'South America', 'SR': 'South America',
    'UY': 'South America', 'VE': 'South America',

    // Africa
    'DZ': 'Africa', 'AO': 'Africa', 'BJ': 'Africa', 'BW': 'Africa', 'BF': 'Africa',
    'BI': 'Africa', 'CM': 'Africa', 'CV': 'Africa', 'CF': 'Africa', 'TD': 'Africa',
    'KM': 'Africa', 'CG': 'Africa', 'CD': 'Africa', 'CI': 'Africa', 'DJ': 'Africa',
    'EG': 'Africa', 'GQ': 'Africa', 'ER': 'Africa', 'ET': 'Africa', 'GA': 'Africa',
    'GM': 'Africa', 'GH': 'Africa', 'GN': 'Africa', 'GW': 'Africa', 'KE': 'Africa',
    'LS': 'Africa', 'LR': 'Africa', 'LY': 'Africa', 'MG': 'Africa', 'MW': 'Africa',
    'ML': 'Africa', 'MR': 'Africa', 'MU': 'Africa', 'MA': 'Africa', 'MZ': 'Africa',
    'NA': 'Africa', 'NE': 'Africa', 'NG': 'Africa', 'RW': 'Africa', 'ST': 'Africa',
    'SN': 'Africa', 'SC': 'Africa', 'SL': 'Africa', 'SO': 'Africa', 'ZA': 'Africa',
    'SS': 'Africa', 'SD': 'Africa', 'SZ': 'Africa', 'TZ': 'Africa', 'TG': 'Africa',
    'TN': 'Africa', 'UG': 'Africa', 'ZM': 'Africa', 'ZW': 'Africa',

    // Oceania
    'AU': 'Oceania', 'FJ': 'Oceania', 'KI': 'Oceania', 'MH': 'Oceania',
    'FM': 'Oceania', 'NR': 'Oceania', 'NZ': 'Oceania', 'PW': 'Oceania',
    'PG': 'Oceania', 'WS': 'Oceania', 'SB': 'Oceania', 'TO': 'Oceania',
    'TV': 'Oceania', 'VU': 'Oceania',

    // Middle East (some overlap with Asia)
    'AE': 'Middle East', 'SA': 'Middle East', 'QA': 'Middle East',
    'KW': 'Middle East', 'BH': 'Middle East', 'OM': 'Middle East'
  }

  return countryRegions[countryCode?.toUpperCase()] || 'Other'
}

/**
 * Validates if coordinates are within a reasonable travel destination range
 */
export function isValidTravelDestination(latitude: number, longitude: number): boolean {
  const coordValidation = validateCoordinates(latitude, longitude)
  if (!coordValidation.isValid) return false

  // Check if coordinates are in Antarctica (usually not a typical travel destination)
  if (latitude < -60) return false

  // Check if coordinates are in the ocean (very rough check)
  // This is a simplified check - more sophisticated would use actual land/water data
  const isLikelyLand = true // For now, assume all valid coordinates could be valid destinations

  return isLikelyLand
}

/**
 * Generates a location slug for URLs
 */
export function generateLocationSlug(locationName: string): string {
  return locationName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

/**
 * Sanitizes location input to prevent XSS
 */
export function sanitizeLocationInput(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .substring(0, 500) // Limit length
}

/**
 * Checks if two locations are approximately the same
 */
export function locationsAreApproximatelyEqual(
  loc1: LocationData,
  loc2: LocationData,
  toleranceKm: number = 1
): boolean {
  const distance = calculateDistance(loc1, loc2)
  return distance <= toleranceKm
}

/**
 * Gets timezone estimate based on longitude (rough approximation)
 */
export function getTimezoneEstimate(longitude: number): string {
  // Very rough timezone estimation based on longitude
  // In a real app, you'd use a proper timezone API or library
  const utcOffset = Math.round(longitude / 15)
  const clampedOffset = Math.max(-12, Math.min(12, utcOffset))

  if (clampedOffset === 0) return 'UTC'
  if (clampedOffset > 0) return `UTC+${clampedOffset}`
  return `UTC${clampedOffset}`
}