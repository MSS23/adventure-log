// REDIRECT — Profile creation now happens server-side via the Clerk
// `user.created` webhook (see AuthProvider's provisioning note). The
// legacy /setup page existed to (a) mint the public.users row at the
// end of Supabase signup and (b) let the user pick a username before
// the first dashboard load.
//
// Both responsibilities have moved:
//   * The row is created by the webhook before the user ever sees the UI.
//   * The auto-generated `user_<id>` username is editable from /settings.
//
// So the standalone /setup route is dead. We forward to the dashboard;
// the middleware will redirect to Clerk's sign-in if the user isn't
// authenticated yet.
//
// TODO(auth-migration): if onboarding feedback shows users want a
// dedicated "pick a username" step before they land on the dashboard,
// reintroduce this page using Clerk's `useUser()` + a Supabase upsert
// (NOT supabase.auth.getUser, which is now a no-op).
import { redirect } from 'next/navigation'

export default function LegacySetupRedirect() {
  redirect('/dashboard')
}
