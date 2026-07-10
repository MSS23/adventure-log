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

// Common country aliases that i18n-iso-countries' English name lookup misses.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  UK: 'GB',
  USA: 'US',
  UAE: 'AE',
  ENGLAND: 'GB',
  SCOTLAND: 'GB',
  WALES: 'GB',
  'NORTHERN IRELAND': 'GB',
  'SOUTH KOREA': 'KR',
  'NORTH KOREA': 'KP',
}

/**
 * Best-effort ISO2 code from a free-text location ("Paris, France" -> "FR").
 * Used as a fallback when albums lack a country_code column value.
 */
export function getCountryCodeFromLocation(locationName?: string | null): string | null {
  const countryName = extractCountryFromLocation(locationName || '')
  if (!countryName) return null
  const upper = countryName.toUpperCase()
  if (COUNTRY_NAME_ALIASES[upper]) return COUNTRY_NAME_ALIASES[upper]
  // A bare 2-letter segment is almost always already an ISO code ("Paris, FR").
  if (/^[A-Z]{2}$/.test(upper) && countries.getName(upper, 'en')) return upper
  return countries.getAlpha2Code(countryName, 'en') || null
}

/**
 * Just the city/primary segment of a location string ("New York, USA" -> "New York").
 */
export function getCityName(locationName?: string | null): string {
  return (locationName || '').split(',')[0]?.trim() || ''
}

/**
 * Produce a clean, de-duplicated location label for display.
 *
 * Fixes the "New York, USA, US" class of bug where a stored `location_name`
 * (which often already ends in a country) gets a raw 2-letter `country_code`
 * appended. Rules:
 *   - drop a bare 2-letter token that just repeats the country code
 *     (the flag / code is shown separately; "Tuscany, IT" -> "Tuscany"),
 *   - case-insensitively de-duplicate repeated segments ("USA, USA" -> "USA"),
 *   - never append the country code; fall back to the country *name* only when
 *     there is no usable location string at all.
 *
 * @param locationName - stored album location string (may be null)
 * @param countryCode  - ISO 3166-1 alpha-2 code (may be null)
 */
export function formatLocationLabel(
  locationName?: string | null,
  countryCode?: string | null,
): string {
  const code = (countryCode || '').toUpperCase()

  const raw = (locationName || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)

  // Drop a trailing/standalone bare country-code token (e.g. "US", "IT").
  const withoutBareCode = raw.filter(
    p => !(p.length === 2 && p.toUpperCase() === code),
  )

  // Case-insensitive de-dupe, preserving first-seen order.
  const seen = new Set<string>()
  const parts = withoutBareCode.filter(p => {
    const key = p.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (parts.length > 0) return parts.join(', ')

  const name = code.length === 2 ? getCountryName(code) : ''
  return name && name !== 'Unknown' ? name : 'Unknown Location'
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
