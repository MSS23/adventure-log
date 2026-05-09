// REDIRECT — Clerk owns sign-up via its hosted UI at `/sign-up`.
// Server-side redirect so old links and SEO crawlers see a 307 instead
// of hydrating dead Supabase signup code.
import { redirect } from 'next/navigation'

export default function LegacySignupRedirect() {
  redirect('/sign-up')
}
