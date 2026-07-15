'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { log } from '@/lib/utils/logger'

export type PassportConnectStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'pending'
  | 'following'
  | 'error'

interface UsePassportConnectOptions {
  targetUserId: string
  qrToken?: string | null
  enabled: boolean
}

/** Shared connect state machine for public and private passport scan landings. */
export function usePassportConnect({
  targetUserId,
  qrToken,
  enabled,
}: UsePassportConnectOptions) {
  const [status, setStatus] = useState<PassportConnectStatus>('idle')
  const [mutualPending, setMutualPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  const attemptConnect = useCallback(async () => {
    setStatus('connecting')
    setErrorMessage(null)

    const postConnect = () =>
      apiFetch('/api/passport/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          ...(qrToken ? { qrToken } : {}),
        }),
      })

    try {
      let response = await postConnect()

      // Native sessions can expire while the camera is open. Refresh once so
      // the first scan behaves the same as a retry instead of silently failing.
      if (response.status === 401) {
        const { createClient } = await import('@/lib/supabase/client')
        const { error } = await createClient().auth.refreshSession()
        if (!error) response = await postConnect()
      }

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setStatus('error')
        setErrorMessage(
          typeof payload?.error === 'string'
            ? payload.error
            : 'Connection failed. Check your signal and try again.',
        )
        return
      }

      if (payload?.connected) {
        setMutualPending(payload.mutual === false)
        setStatus('connected')
      } else if (payload?.pending) {
        setStatus('pending')
      } else if (payload?.following) {
        setStatus('following')
      } else {
        setStatus('error')
        setErrorMessage('This passport could not be connected. Ask its owner to refresh the QR code.')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage('Connection failed. Check your signal and try again.')
      log.error(
        'Passport connect failed',
        { component: 'PassportConnect', action: 'connect', targetUserId },
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }, [targetUserId, qrToken])

  useEffect(() => {
    if (!enabled || attemptedRef.current) return
    attemptedRef.current = true
    void attemptConnect()
  }, [enabled, attemptConnect])

  return {
    status,
    mutualPending,
    errorMessage,
    retry: attemptConnect,
  }
}
