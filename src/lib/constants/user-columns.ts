/**
 * Safe column list for reading OTHER users' rows from public.users.
 *
 * Migration 75 (users PII lockdown) revokes table-level SELECT on
 * public.users and grants it back column-by-column on exactly this list.
 * After that migration, `select('*')` on users (and `users!...(*)` embeds)
 * fails with 42501 "permission denied" because the star expands to revoked
 * PII columns (email, date_of_birth, phone, two_factor_secret, ...).
 *
 * Use this constant for any cross-user profile read:
 *
 *   supabase.from('users').select(PUBLIC_USER_COLUMNS)
 *   supabase.from('follows').select(`*, follower:users!fk(${PUBLIC_USER_COLUMNS})`)
 *
 * For the signed-in user's OWN full row (including the sensitive columns),
 * call the SECURITY DEFINER RPC instead: supabase.rpc('get_my_profile').
 *
 * Keep this list in sync with the allowlist in
 * supabase/migrations/76_users_pii_lockdown.sql.
 */
export const PUBLIC_USER_COLUMNS =
  'id, username, display_name, name, bio, avatar_url, cover_photo_url, ' +
  'website, privacy_level, is_private, is_verified, created_at, updated_at, ' +
  'deleted_at, location, home_city, home_country, home_location_is_public, ' +
  'current_streak_days, longest_streak_days, last_activity_date'
