// REDIRECT — Supabase sends its own confirmation email; the signup page shows
// an inline "check your email" state, so this standalone route is legacy.
// Anyone landing here is sent to the canonical sign-in route.
import { redirect } from 'next/navigation'

export default function LegacyVerifyEmailRedirect() {
  redirect('/login')
}
