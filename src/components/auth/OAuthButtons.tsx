'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Loader2 } from 'lucide-react'

type Provider = 'google' | 'discord' | 'apple'

const PROVIDERS: {
  id: Provider
  label: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
}[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 009 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.73a5.42 5.42 0 010-3.46V4.95H.96a9 9 0 000 8.1l3.01-2.32z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
    ),
    bg: '#FFFFFF',
    text: '#1A1A17',
    border: 'var(--color-line-warm)',
  },
  {
    id: 'discord',
    label: 'Continue with Discord',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
        <path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 00-.031-.029zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    bg: '#5865F2',
    text: '#FFFFFF',
    border: '#5865F2',
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
    bg: '#000000',
    text: '#FFFFFF',
    border: '#000000',
  },
]

export function OAuthButtons({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
  const supabase = createClient()

  const handleSignIn = async (provider: Provider) => {
    try {
      setLoadingProvider(provider)
      const next = encodeURIComponent(redirectTo)
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${next}`,
        },
      })
      if (error) throw error
    } catch (error) {
      log.error(
        'OAuth sign-in failed',
        { component: 'OAuthButtons', provider },
        error as Error
      )
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleSignIn(p.id)}
          disabled={loadingProvider !== null}
          className="w-full inline-flex items-center justify-center gap-2.5 h-11 px-4 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: p.bg,
            color: p.text,
            border: `1px solid ${p.border}`,
          }}
        >
          {loadingProvider === p.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            p.icon
          )}
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Ivory OR divider — use between OAuth buttons and email form.
 */
export function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: 'var(--color-line-warm)' }} />
      <span
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--color-muted-warm)' }}
      >
        or with email
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--color-line-warm)' }} />
    </div>
  )
}
