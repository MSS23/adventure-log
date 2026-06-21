// REDIRECT — the canonical Supabase password-reset route is /reset-password
// (which calls supabase.auth.resetPasswordForEmail). This shim catches any
// in-app links pointing at the old /forgot-password path.
import { redirect } from 'next/navigation'

export default function LegacyForgotPasswordRedirect() {
  redirect('/reset-password')
}
