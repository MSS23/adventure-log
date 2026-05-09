// REDIRECT — Password reset is owned by Clerk's hosted UI. The Forgot
// Password link in Clerk's sign-in form drives the reset flow end-to-end
// (email + token verification + new-password form). This shim catches any
// in-app links pointing at the old Supabase route.
import { redirect } from 'next/navigation'

export default function LegacyForgotPasswordRedirect() {
  redirect('/sign-in')
}
