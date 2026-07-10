/**
 * Coordinate/country fallbacks that keep coordinate-less albums on the
 * Wrapped flight path (July 2026 "Paris doesn't fly" fix).
 */

import { getCountryCentroid } from '@/lib/utils/country-centroids'
import { getCountryCodeFromLocation } from '@/lib/utils/country'

describe('getCountryCentroid', () => {
  it('returns coordinates for known ISO2 codes', () => {
    const fr = getCountryCentroid('FR')
    expect(fr).not.toBeNull()
    expect(fr!.lat).toBeGreaterThan(40)
    expect(fr!.lat).toBeLessThan(52)
    expect(fr!.lng).toBeGreaterThan(-6)
    expect(fr!.lng).toBeLessThan(10)
  })

  it('is case-insensitive and trims', () => {
    expect(getCountryCentroid('gb')).toEqual(getCountryCentroid('GB'))
    expect(getCountryCentroid(' jp ')).toEqual(getCountryCentroid('JP'))
  })

  it('returns null for unknown or empty codes', () => {
    expect(getCountryCentroid('ZZ')).toBeNull()
    expect(getCountryCentroid('')).toBeNull()
    expect(getCountryCentroid(null)).toBeNull()
    expect(getCountryCentroid(undefined)).toBeNull()
  })

  it('covers every code the app commonly stores', () => {
    for (const code of ['US', 'GB', 'FR', 'ES', 'DE', 'IT', 'JP', 'AU', 'IN', 'BR', 'GR']) {
      expect(getCountryCentroid(code)).not.toBeNull()
    }
  })
})

describe('getCountryCodeFromLocation', () => {
  it('resolves "City, Country" strings', () => {
    expect(getCountryCodeFromLocation('Paris, France')).toBe('FR')
    expect(getCountryCodeFromLocation('Tokyo, Japan')).toBe('JP')
    expect(getCountryCodeFromLocation('Athens, Greece')).toBe('GR')
  })

  it('resolves multi-segment strings by the last part', () => {
    expect(getCountryCodeFromLocation('London, England, United Kingdom')).toBe('GB')
  })

  it('handles common aliases', () => {
    expect(getCountryCodeFromLocation('London, UK')).toBe('GB')
    expect(getCountryCodeFromLocation('New York, USA')).toBe('US')
    expect(getCountryCodeFromLocation('Manchester, England')).toBe('GB')
    expect(getCountryCodeFromLocation('Seoul, South Korea')).toBe('KR')
  })

  it('passes through bare ISO codes', () => {
    expect(getCountryCodeFromLocation('Paris, FR')).toBe('FR')
  })

  it('returns null when nothing matches', () => {
    expect(getCountryCodeFromLocation('Somewhere, Atlantis')).toBeNull()
    expect(getCountryCodeFromLocation('')).toBeNull()
    expect(getCountryCodeFromLocation(null)).toBeNull()
    expect(getCountryCodeFromLocation(undefined)).toBeNull()
  })
})
