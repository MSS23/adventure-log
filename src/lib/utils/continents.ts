/**
 * Canonical country → continent mapping and continent metadata.
 *
 * Replaces the several divergent copies that used to live in the passport
 * pages, the travel-card image route, and TravelInsights — which disagreed on
 * both coverage (some were small subsets) and shape (full names vs. 2-letter
 * codes), producing inconsistent continent counts and personalities between
 * the app and public views.
 */

export type Continent =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Asia'
  | 'Oceania'

export const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  US: 'North America', CA: 'North America', MX: 'North America',
  GT: 'North America', BZ: 'North America', HN: 'North America',
  SV: 'North America', NI: 'North America', CR: 'North America',
  PA: 'North America', CU: 'North America', JM: 'North America',
  HT: 'North America', DO: 'North America', TT: 'North America',
  BB: 'North America', BS: 'North America', PR: 'North America',
  AG: 'North America', DM: 'North America', GD: 'North America',
  KN: 'North America', LC: 'North America', VC: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America',
  CO: 'South America', PE: 'South America', VE: 'South America',
  EC: 'South America', BO: 'South America', PY: 'South America',
  UY: 'South America', GY: 'South America', SR: 'South America',
  GF: 'South America',
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe',
  ES: 'Europe', PT: 'Europe', NL: 'Europe', BE: 'Europe',
  CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe',
  DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe',
  CZ: 'Europe', RO: 'Europe', HU: 'Europe', GR: 'Europe',
  HR: 'Europe', BG: 'Europe', SK: 'Europe', SI: 'Europe',
  LT: 'Europe', LV: 'Europe', EE: 'Europe', CY: 'Europe',
  MT: 'Europe', LU: 'Europe', IS: 'Europe', AL: 'Europe',
  RS: 'Europe', BA: 'Europe', ME: 'Europe', MK: 'Europe',
  XK: 'Europe', MD: 'Europe', UA: 'Europe', BY: 'Europe',
  RU: 'Europe', GE: 'Europe', AM: 'Europe', AZ: 'Europe',
  TR: 'Europe', MC: 'Europe', AD: 'Europe', SM: 'Europe',
  VA: 'Europe', LI: 'Europe',
  ZA: 'Africa', NG: 'Africa', KE: 'Africa', EG: 'Africa',
  MA: 'Africa', GH: 'Africa', TZ: 'Africa', ET: 'Africa',
  UG: 'Africa', SN: 'Africa', CI: 'Africa', CM: 'Africa',
  MZ: 'Africa', MG: 'Africa', AO: 'Africa', ZM: 'Africa',
  ZW: 'Africa', BW: 'Africa', NA: 'Africa', RW: 'Africa',
  TN: 'Africa', DZ: 'Africa', LY: 'Africa', SD: 'Africa',
  ML: 'Africa', NE: 'Africa', TD: 'Africa', GA: 'Africa',
  CG: 'Africa', CD: 'Africa', BJ: 'Africa', BF: 'Africa',
  TG: 'Africa', SL: 'Africa', LR: 'Africa', GN: 'Africa',
  GW: 'Africa', CV: 'Africa', MU: 'Africa', SC: 'Africa',
  ER: 'Africa', DJ: 'Africa', SO: 'Africa', MW: 'Africa',
  LS: 'Africa', SZ: 'Africa', GM: 'Africa', MR: 'Africa',
  SS: 'Africa', CF: 'Africa', GQ: 'Africa', ST: 'Africa',
  KM: 'Africa',
  CN: 'Asia', JP: 'Asia', KR: 'Asia', IN: 'Asia',
  ID: 'Asia', TH: 'Asia', VN: 'Asia', PH: 'Asia',
  MY: 'Asia', SG: 'Asia', MM: 'Asia', KH: 'Asia',
  LA: 'Asia', BD: 'Asia', LK: 'Asia', NP: 'Asia',
  PK: 'Asia', AF: 'Asia', IR: 'Asia', IQ: 'Asia',
  SA: 'Asia', AE: 'Asia', QA: 'Asia', KW: 'Asia',
  BH: 'Asia', OM: 'Asia', YE: 'Asia', JO: 'Asia',
  LB: 'Asia', SY: 'Asia', IL: 'Asia', PS: 'Asia',
  UZ: 'Asia', KZ: 'Asia', KG: 'Asia', TJ: 'Asia',
  TM: 'Asia', MN: 'Asia', BN: 'Asia', TL: 'Asia',
  MV: 'Asia', BT: 'Asia', TW: 'Asia', HK: 'Asia',
  MO: 'Asia', KP: 'Asia',
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
  WS: 'Oceania', TO: 'Oceania', VU: 'Oceania', SB: 'Oceania',
  KI: 'Oceania', FM: 'Oceania', MH: 'Oceania', PW: 'Oceania',
  NR: 'Oceania', TV: 'Oceania', CK: 'Oceania', NU: 'Oceania',
  NC: 'Oceania', PF: 'Oceania', GU: 'Oceania',
}

/** Approximate country count per continent, used for "progress" ratios. */
export const CONTINENT_TOTALS: Record<Continent, number> = {
  'North America': 23,
  'South America': 13,
  'Europe': 50,
  'Africa': 54,
  'Asia': 48,
  'Oceania': 14,
}

/** Emoji per continent for compact UI badges. */
export const CONTINENT_EMOJI: Record<Continent, string> = {
  'Europe': '🏰',
  'Asia': '🏯',
  'North America': '🗽',
  'South America': '🌿',
  'Africa': '🦁',
  'Oceania': '🏝️',
}

/** Resolve a 2-letter country code to its continent (case-insensitive). */
export function getContinent(countryCode: string | null | undefined): Continent | undefined {
  if (!countryCode) return undefined
  return COUNTRY_TO_CONTINENT[countryCode.toUpperCase()]
}

/** Number of distinct continents spanned by a set of country codes. */
export function countContinents(countryCodes: string[]): number {
  return new Set(countryCodes.map(getContinent).filter(Boolean)).size
}
