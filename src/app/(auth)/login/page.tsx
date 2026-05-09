// REDIRECT — Clerk owns sign-in via its hosted UI at `/sign-in`.
// This server-component shim keeps deep links to the old Supabase login
// route working (bookmarks, old emails, internal links we haven't yet
// migrated). It also forwards the `redirect` query param so post-login
// "return to" flows (e.g. PrivateAlbumGate) survive the bounce.
import { redirect } from 'next/navigation'

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyLoginRedirect({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectParam = params.redirect
  const target =
    typeof redirectParam === 'string' && redirectParam.startsWith('/')
      ? `/sign-in?redirect_url=${encodeURIComponent(redirectParam)}`
      : '/sign-in'
  redirect(target)
}
