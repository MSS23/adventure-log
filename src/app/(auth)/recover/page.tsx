// REDIRECT — Account recovery for soft-deleted profiles is not yet rebuilt as
// a self-serve flow. For now we send users to sign in; recovery is handled by
// contacting support within the 30-day window (the `restore_user_account` RPC
// exists for this). When rebuilt, this will likely live as a banner inside
// /settings rather than a standalone route.
import { redirect } from 'next/navigation'

export default function LegacyRecoverRedirect() {
  redirect('/login')
}
