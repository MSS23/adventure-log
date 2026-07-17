/**
 * Age gate — Adventure Log is an adults-only (18+) service.
 *
 * The DOB is self-declared; we make reasonable efforts (a hard 18+ block at
 * sign-up), not biometric verification.
 */

/** Minimum age to use the service. */
export const MIN_AGE = 18

/** Whole years between `dob` and now. Returns null for an invalid/future date. */
export function calculateAge(dob: Date | string): number | null {
  const birth = typeof dob === 'string' ? new Date(dob) : dob
  if (!birth || Number.isNaN(birth.getTime())) return null

  const now = new Date()
  if (birth.getTime() > now.getTime()) return null

  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/** True when the date of birth is a valid date and 18 or older. */
export function isAdult(dob: Date | string): boolean {
  const age = calculateAge(dob)
  return age !== null && age >= MIN_AGE
}

/**
 * Strict YYYY-MM-DD validation, including calendar validity — JS Date rolls
 * "2025-02-31" over to March 3rd, so a parse-only check silently accepts
 * impossible dates. The round-trip comparison rejects them.
 */
export function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}
