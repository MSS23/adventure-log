'use client'

// Web-only OAuth callback. Clerk redirects the browser here after the IDP
// (Google/Apple/Discord) returns. <AuthenticateWithRedirectCallback /> reads
// the OAuth handshake parameters from the URL, finalises the Clerk session,
// and then performs a client-side navigation to either redirectUrl (if the
// caller passed one to signIn.sso/signUp.sso) or `/`.
//
// On Capacitor native builds we never hit this route — native OAuth must
// route through the system in-app browser + a custom URL-scheme deep link
// (the Capacitor bridge file was removed; recreate from git history when
// native OAuth is wired up).
//
// We render a small loading state because the redirect is driven by Clerk's
// JS bundle, which has to load + run before the navigation fires.

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F1] dark:bg-black px-4 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      <p className="text-sm text-olive-600 dark:text-olive-400">Finishing sign-in…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/feed"
        signUpFallbackRedirectUrl="/setup"
      />
    </div>
  )
}
