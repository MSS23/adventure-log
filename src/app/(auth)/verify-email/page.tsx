// REDIRECT — Clerk handles email verification entirely inside its
// hosted UI / verification email flow. Anyone landing here from an
// old Supabase verification link should be sent to Clerk sign-in,
// where they can continue (or restart) verification.
import { redirect } from 'next/navigation'

export default function LegacyVerifyEmailRedirect() {
  redirect('/sign-in')
}
