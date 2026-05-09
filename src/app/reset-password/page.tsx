// REDIRECT — Password reset is fully owned by Clerk's hosted UI; the
// reset link in a Clerk-issued email lands inside Clerk, not here. This
// shim covers (a) old Supabase reset emails still in the wild and (b)
// any internal links that haven't been swept yet.
import { redirect } from 'next/navigation'

export default function LegacyResetPasswordRedirect() {
  redirect('/sign-in')
}
