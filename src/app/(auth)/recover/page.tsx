// REDIRECT — The legacy recover-account page implemented Supabase-flavoured
// soft-delete restore via a Supabase RPC. Since Clerk took over auth, the
// soft-delete recovery UX needs a rebuild that's out of scope for this
// migration cleanup. For now, send users to sign-in; account recovery for
// soft-deleted profiles will be re-introduced as a Clerk-aware flow.
//
// TODO(auth-migration): rebuild account recovery UX inside the Clerk
// session — likely as a banner inside settings rather than a standalone
// route — and wire it to the existing `restore_user_account` RPC.
import { redirect } from 'next/navigation'

export default function LegacyRecoverRedirect() {
  redirect('/sign-in')
}
