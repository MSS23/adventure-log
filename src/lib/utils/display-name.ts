/**
 * Display-name resolution.
 *
 * The Supabase signup trigger defaults `users.display_name` to the literal
 * string `'New User'` when auth metadata carries no `full_name` (see
 * migration 39, `handle_new_user`). That placeholder should never reach the
 * UI — we always prefer a real `display_name`, then fall back to the
 * `@username`, then a final generic label.
 *
 * Use these helpers everywhere a user's name or avatar-initial is rendered so
 * the fallback order is consistent across the app.
 */

/** Placeholder values that should be treated as "no display name set". */
const PLACEHOLDER_NAMES = new Set(['new user', 'new explorer', 'anonymous', 'unknown'])

function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true
  const trimmed = value.trim()
  if (trimmed === '') return true
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase())
}

/**
 * Returns the best human-readable name for a user.
 *
 * Order: real display name → username → `fallback` (default `'Explorer'`).
 * A `display_name` of `'New User'` / empty / whitespace is skipped in favour
 * of the username.
 */
export function getDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  fallback: string = 'Explorer'
): string {
  if (!isPlaceholder(displayName)) return displayName!.trim()
  if (username && username.trim()) return username.trim()
  return fallback
}

/**
 * Returns the single uppercase initial to show in an avatar fallback,
 * derived from the same resolution order as {@link getDisplayName}.
 */
export function getDisplayInitial(
  displayName: string | null | undefined,
  username: string | null | undefined
): string {
  const name = getDisplayName(displayName, username, '')
  return name.charAt(0).toUpperCase() || 'U'
}
