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
 * Parse a date input into a `Date`, treating date-only strings as LOCAL
 * calendar dates.
 *
 * Album travel dates (`date_start`/`date_end`) are Postgres `DATE` columns, so
 * PostgREST returns them as `"YYYY-MM-DD"`. `new Date("2025-01-01")` parses that
 * as UTC midnight, which in any timezone behind UTC rolls back to the previous
 * day/month/year — shifting displayed dates and year/month bucketing. Parsing
 * the components into a local `Date` keeps the calendar date the user entered.
 *
 * Full timestamps (e.g. `created_at`, ISO strings with a time component) and
 * `Date` instances are passed through to the native parser unchanged.
 *
 * Returns `null` when the input is missing or cannot be parsed.
 */
export function parseLocalDate(date: string | Date | null | undefined): Date | null {
  if (date === null || date === undefined) {
    return null
  }

  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    const local = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(local.getTime()) ? null : local
  }

  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Coerce the supported date inputs into a valid `Date`, or `null` when the
 * input is missing or cannot be parsed. Date-only strings are treated as local
 * calendar dates (see {@link parseLocalDate}).
 */
function toValidDate(date: string | Date | null | undefined): Date | null {
  return parseLocalDate(date)
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

/** Format a date range without revealing more precision than `view` allows. */
export function formatTravelDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  opts: { view: TravelDateView; latitude?: number },
): string {
  const start = formatTravelDate(startDate, opts)
  if (!start) return ''

  const end = formatTravelDate(endDate, opts)
  if (!end || end === start) return start
  return `${start} – ${end}`
}

export function formatTravelDateRangeForViewer(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  isOwnProfile: boolean,
  latitude?: number,
): string {
  return formatTravelDateRange(startDate, endDate, {
    view: isOwnProfile ? 'precise' : 'fuzzy',
    latitude,
  })
}
