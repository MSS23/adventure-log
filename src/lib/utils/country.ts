import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

// Register English locale
countries.registerLocale(enLocale)

/**
 * Get country name from ISO 3166-1 alpha-2 country code
 * @param countryCode - Two-letter country code (e.g., 'IT', 'JP', 'US')
 * @returns Country name in English (e.g., 'Italy', 'Japan', 'United States')
 */
export function getCountryName(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return 'Unknown'
  }

  const name = countries.getName(countryCode.toUpperCase(), 'en')
  return name || countryCode
}

/**
 * Convert country code to flag emoji
 * @param countryCode - Two-letter country code (e.g., 'IT', 'JP', 'US')
 * @returns Flag emoji (e.g., '🇮🇹', '🇯🇵', '🇺🇸')
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🏳️' // White flag for unknown
  }

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}

/**
 * Extract country name from location string
 * Assumes format: "City, Country" or "City, Region, Country"
 * @param locationName - Full location string
 * @returns Extracted country name (last part after comma)
 */
export function extractCountryFromLocation(locationName: string): string {
  if (!locationName) return ''

  const parts = locationName.split(',').map(p => p.trim())
  return parts[parts.length - 1] || ''
}

/**
 * Get all countries as an array of { code, name } objects
 * @returns Array of country objects sorted by name
 */
export function getAllCountries(): Array<{ code: string; name: string }> {
  const countryCodes = Object.keys(countries.getAlpha2Codes())

  return countryCodes
    .map(code => ({
      code,
      name: getCountryName(code)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
