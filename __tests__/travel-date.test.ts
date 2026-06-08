import {
  formatTravelDate,
  formatTravelDateForViewer,
} from '@/lib/utils/travel-date'

/**
 * Helper to build a UTC-midday date for a given year/month/day so that the
 * local-timezone interpretation of the Date stays on the intended calendar
 * day in any reasonable test environment.
 */
function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0)
}

describe('formatTravelDate', () => {
  describe('precise view', () => {
    it('formats a date as "Month Day, Year" in en-US', () => {
      expect(
        formatTravelDate(makeDate(2025, 5, 8), { view: 'precise' })
      ).toBe('June 8, 2025')
    })

    it('accepts an ISO string and formats it precisely', () => {
      expect(
        formatTravelDate('2025-06-08T12:00:00', { view: 'precise' })
      ).toBe('June 8, 2025')
    })

    it('ignores latitude in precise view', () => {
      expect(
        formatTravelDate(makeDate(2025, 5, 8), { view: 'precise', latitude: -34 })
      ).toBe('June 8, 2025')
    })
  })

  describe('fuzzy view — northern hemisphere season boundaries', () => {
    const cases: Array<[number, string]> = [
      [0, 'Winter 2025'], // January
      [1, 'Winter 2025'], // February
      [2, 'Spring 2025'], // March
      [3, 'Spring 2025'], // April
      [4, 'Spring 2025'], // May
      [5, 'Summer 2025'], // June
      [6, 'Summer 2025'], // July
      [7, 'Summer 2025'], // August
      [8, 'Autumn 2025'], // September
      [9, 'Autumn 2025'], // October
      [10, 'Autumn 2025'], // November
      [11, 'Winter 2025'], // December
    ]

    it.each(cases)('month index %i -> %s (northern)', (month, expected) => {
      expect(
        formatTravelDate(makeDate(2025, month, 15), { view: 'fuzzy' })
      ).toBe(expected)
    })

    it('treats a non-negative latitude as northern hemisphere', () => {
      expect(
        formatTravelDate(makeDate(2025, 5, 15), { view: 'fuzzy', latitude: 51 })
      ).toBe('Summer 2025')
    })

    it('uses the date own calendar year for December -> "Winter <sameYear>"', () => {
      expect(
        formatTravelDate(makeDate(2025, 11, 25), { view: 'fuzzy' })
      ).toBe('Winter 2025')
    })
  })

  describe('fuzzy view — southern hemisphere flip (latitude < 0)', () => {
    it('flips Summer to Winter for June', () => {
      expect(
        formatTravelDate(makeDate(2025, 5, 15), { view: 'fuzzy', latitude: -33.8 })
      ).toBe('Winter 2025')
    })

    it('flips Winter to Summer for January', () => {
      expect(
        formatTravelDate(makeDate(2025, 0, 15), { view: 'fuzzy', latitude: -33.8 })
      ).toBe('Summer 2025')
    })

    it('flips Spring to Autumn for April', () => {
      expect(
        formatTravelDate(makeDate(2025, 3, 15), { view: 'fuzzy', latitude: -10 })
      ).toBe('Autumn 2025')
    })

    it('flips Autumn to Spring for October', () => {
      expect(
        formatTravelDate(makeDate(2025, 9, 15), { view: 'fuzzy', latitude: -10 })
      ).toBe('Spring 2025')
    })

    it('keeps December in the same calendar year after flipping (Winter -> Summer 2025)', () => {
      expect(
        formatTravelDate(makeDate(2025, 11, 25), { view: 'fuzzy', latitude: -45 })
      ).toBe('Summer 2025')
    })
  })

  describe('invalid / missing input', () => {
    it('returns empty string for null', () => {
      expect(formatTravelDate(null, { view: 'precise' })).toBe('')
      expect(formatTravelDate(null, { view: 'fuzzy' })).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatTravelDate(undefined, { view: 'precise' })).toBe('')
      expect(formatTravelDate(undefined, { view: 'fuzzy' })).toBe('')
    })

    it('returns empty string for an unparseable string', () => {
      expect(formatTravelDate('not-a-date', { view: 'precise' })).toBe('')
      expect(formatTravelDate('not-a-date', { view: 'fuzzy' })).toBe('')
    })

    it('returns empty string for an invalid Date object', () => {
      expect(formatTravelDate(new Date('nope'), { view: 'precise' })).toBe('')
    })

    it('does not throw for any of the invalid inputs', () => {
      expect(() => formatTravelDate(null, { view: 'fuzzy' })).not.toThrow()
      expect(() => formatTravelDate('garbage', { view: 'precise' })).not.toThrow()
    })
  })
})

describe('formatTravelDateForViewer', () => {
  const date = makeDate(2025, 5, 8) // June 8, 2025

  it('delegates to the precise view for the profile owner', () => {
    expect(formatTravelDateForViewer(date, true)).toBe(
      formatTravelDate(date, { view: 'precise' })
    )
    expect(formatTravelDateForViewer(date, true)).toBe('June 8, 2025')
  })

  it('delegates to the fuzzy view for a viewer', () => {
    expect(formatTravelDateForViewer(date, false)).toBe(
      formatTravelDate(date, { view: 'fuzzy' })
    )
    expect(formatTravelDateForViewer(date, false)).toBe('Summer 2025')
  })

  it('threads latitude through for owner (precise) without affecting output', () => {
    expect(formatTravelDateForViewer(date, true, -45)).toBe(
      formatTravelDate(date, { view: 'precise', latitude: -45 })
    )
  })

  it('threads latitude through for viewer (fuzzy) and flips hemisphere', () => {
    expect(formatTravelDateForViewer(date, false, -45)).toBe(
      formatTravelDate(date, { view: 'fuzzy', latitude: -45 })
    )
    expect(formatTravelDateForViewer(date, false, -45)).toBe('Winter 2025')
  })

  it('returns empty string for invalid dates regardless of ownership', () => {
    expect(formatTravelDateForViewer(null, true)).toBe('')
    expect(formatTravelDateForViewer(undefined, false)).toBe('')
    expect(formatTravelDateForViewer('bad', false, -10)).toBe('')
  })
})
