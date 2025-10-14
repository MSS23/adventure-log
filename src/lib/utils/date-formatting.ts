/**
 * Date formatting utilities that respect privacy settings
 *
 * By default, only month and year are shown to protect user privacy.
 * Users can opt-in to show exact dates if they choose.
 */

export interface DateFormatOptions {
  showExactDates?: boolean
  includeDay?: boolean // For backwards compatibility
}

/**
 * Format a date respecting privacy settings
 *
 * @param dateString - ISO date string
 * @param options - Formatting options including privacy preferences
 * @returns Formatted date string (either "Month Year" or "Month Day, Year")
 */
export function formatDate(dateString: string | null | undefined, options: DateFormatOptions = {}): string {
  if (!dateString) return ''

  const { showExactDates = false, includeDay = false } = options
  const shouldShowDay = showExactDates || includeDay

  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return ''
    }

    if (shouldShowDay) {
      // Show exact date: "December 12, 1999"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } else {
      // Show only month and year: "December 1999"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    }
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Format a date range respecting privacy settings
 *
 * @param startDate - ISO date string for start
 * @param endDate - ISO date string for end
 * @param options - Formatting options including privacy preferences
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!startDate && !endDate) return ''
  if (!startDate) return formatDate(endDate, options)
  if (!endDate) return formatDate(startDate, options)

  const { showExactDates = false, includeDay = false } = options
  const shouldShowDay = showExactDates || includeDay

  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return formatDate(startDate, options) || formatDate(endDate, options)
    }

    // If same date, just show once
    if (startDate === endDate) {
      return formatDate(startDate, options)
    }

    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    const startMonth = start.getMonth()
    const endMonth = end.getMonth()

    if (shouldShowDay) {
      // Show exact dates

      // Same month and year: "December 12-25, 1999"
      if (startYear === endYear && startMonth === endMonth) {
        const monthYear = start.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })
        const startDay = start.getDate()
        const endDay = end.getDate()
        return `${monthYear.split(' ')[0]} ${startDay}-${endDay}, ${startYear}`
      }

      // Same year: "December 12 - January 15, 1999"
      if (startYear === endYear) {
        const startFormatted = start.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric'
        })
        const endFormatted = end.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
        return `${startFormatted} - ${endFormatted}`
      }

      // Different years: "December 12, 1999 - January 15, 2000"
      return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`
    } else {
      // Show only month and year

      // Same month and year: "December 1999"
      if (startYear === endYear && startMonth === endMonth) {
        return formatDate(startDate, options)
      }

      // Same year: "December - January 1999"
      if (startYear === endYear) {
        const startMonth = start.toLocaleDateString('en-US', { month: 'long' })
        const endMonth = end.toLocaleDateString('en-US', { month: 'long' })
        return `${startMonth} - ${endMonth} ${startYear}`
      }

      // Different years: "December 1999 - January 2000"
      return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`
    }
  } catch (error) {
    console.error('Error formatting date range:', error)
    return formatDate(startDate, options) || formatDate(endDate, options)
  }
}

/**
 * Get a short date format for compact displays
 * Always shows month and year only for privacy
 *
 * @param dateString - ISO date string
 * @returns Short formatted date (e.g., "Dec 1999")
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)

    if (isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  } catch (error) {
    console.error('Error formatting short date:', error)
    return ''
  }
}

/**
 * Format a relative date (e.g., "2 hours ago", "3 days ago")
 * Used for timestamps like "created at", "updated at"
 */
export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    const diffMonth = Math.floor(diffDay / 30)
    const diffYear = Math.floor(diffDay / 365)

    if (diffSec < 60) return 'just now'
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`
    if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`
    if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`
  } catch (error) {
    console.error('Error formatting relative date:', error)
    return ''
  }
}
