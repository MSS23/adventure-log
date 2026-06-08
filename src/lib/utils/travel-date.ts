/**
 * Viewer-aware travel-date formatting.
 *
 * Owners of a profile see precise dates ("June 8, 2025"). Viewers of someone
 * else's profile see fuzzy, season-based dates ("Summer 2025") so that exact
 * travel timing is not exposed.
 *
 * All functions are pure, have no side effects, and never throw. Invalid,
 * null, or undefined dates resolve to an empty string.
 */

export type TravelDateView = 'precise' | 'fuzzy'

type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn'

/**
 * Coerce the supported date inputs into a valid `Date`, or `null` when the
 * input is missing or cannot be parsed.
 */
function toValidDate(date: string | Date | null | undefined): Date | null {
  if (date === null || date === undefined) {
    return null
  }

  const parsed = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

/**
 * Derive the season for a given calendar month (0-indexed, as returned by
 * `Date.prototype.getMonth`).
 *
 * Northern hemisphere mapping:
 *   Dec/Jan/Feb -> Winter
 *   Mar/Apr/May -> Spring
 *   Jun/Jul/Aug -> Summer
 *   Sep/Oct/Nov -> Autumn
 *
 * When `latitude` is provided and negative (southern hemisphere) the seasons
 * are flipped. A missing or non-negative latitude is treated as northern
 * hemisphere.
 */
function getSeason(month: number, latitude?: number): Season {
  const northern: Season[] = [
    'Winter', // Jan
    'Winter', // Feb
    'Spring', // Mar
    'Spring', // Apr
    'Spring', // May
    'Summer', // Jun
    'Summer', // Jul
    'Summer', // Aug
    'Autumn', // Sep
    'Autumn', // Oct
    'Autumn', // Nov
    'Winter', // Dec
  ]

  const season = northern[month]
  const isSouthern = typeof latitude === 'number' && latitude < 0

  if (!isSouthern) {
    return season
  }

  const flipped: Record<Season, Season> = {
    Winter: 'Summer',
    Spring: 'Autumn',
    Summer: 'Winter',
    Autumn: 'Spring',
  }

  return flipped[season]
}

/**
 * Format a travel date for display.
 *
 * - `'precise'`: locale date string, e.g. "June 8, 2025".
 * - `'fuzzy'`: season + year, e.g. "Summer 2025". Hemisphere-aware only when
 *   `latitude` is supplied and negative.
 *
 * Returns an empty string for invalid, null, or undefined dates.
 */
export function formatTravelDate(
  date: string | Date | null | undefined,
  opts: { view: TravelDateView; latitude?: number }
): string {
  const valid = toValidDate(date)
  if (!valid) {
    return ''
  }

  if (opts.view === 'precise') {
    return valid.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Fuzzy: season derived from the date's own calendar month/year.
  const season = getSeason(valid.getMonth(), opts.latitude)
  return `${season} ${valid.getFullYear()}`
}

/**
 * Convenience wrapper that selects the view based on whether the current
 * viewer owns the profile being viewed.
 *
 * - Owner (`isOwnProfile === true`)  -> precise dates.
 * - Viewer (`isOwnProfile === false`) -> fuzzy dates.
 */
export function formatTravelDateForViewer(
  date: string | Date | null | undefined,
  isOwnProfile: boolean,
  latitude?: number
): string {
  return formatTravelDate(date, {
    view: isOwnProfile ? 'precise' : 'fuzzy',
    latitude,
  })
}
