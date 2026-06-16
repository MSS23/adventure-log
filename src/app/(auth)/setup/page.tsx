// REDIRECT — Profile creation happens automatically on first sign-in
// (AuthProvider provisions the public.users row, with the database
// `create_profile_on_signup` trigger as a backup), and the auto-generated
// `user_<id>` username is editable from /settings. The standalone /setup
// route is therefore no longer needed; we forward to the dashboard. The
// middleware redirects to /login if the user isn't authenticated yet.
import { redirect } from 'next/navigation'

export default function LegacySetupRedirect() {
  redirect('/dashboard')
}
