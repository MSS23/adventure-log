'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCheck, ArrowRight, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { log } from '@/lib/utils/logger'

/**
 * Pulls the passport OWNER into the "you're now connected" → Travel Blend
 * experience the moment someone scans their QR — mirroring what the scanner
 * already sees on the public passport page. Without this, only the scanner
 * lands in the compatibility view; the owner just gets a silent bell row.
 *
 * How it works: /api/passport/connect inserts a `passport_connect` notification
 * for the owner (user_id = owner, sender_id = scanner, metadata.scanner_id =
 * scanner). This listener subscribes to realtime INSERTs on `notifications`
 * for the current user and, when a fresh passport_connect arrives, surfaces a
 * modal that deep-links into `/blend/<scanner>` — the same symmetric blend the
 * scanner sees, so both travelers compare their journeys.
 *
 * Requires `notifications` to be in the supabase_realtime publication (migration
 * 72). Mounted once, app-wide, in the (app) layout.
 */

interface ConnectPayload {
  scannerId: string
  scannerName: string
  scannerUsername: string | null
  scannerAvatarUrl: string | null
  blendHref: string
}

// Minimal shape of the realtime notification row we care about.
interface NotificationRow {
  user_id: string
  sender_id?: string | null
  type: string
  link?: string | null
  metadata?: Record<string, unknown> | null
}

export function PassportConnectListener() {
  const { user, profile } = useAuth()
  const pathname = usePathname()
  const [connect, setConnect] = useState<ConnectPayload | null>(null)

  // Dismiss on any navigation. The CTA is a <Link>, but on native
  // NativeNavigationAdapter takes over the click in the capture phase and calls
  // stopPropagation(), which swallows the anchor's onClick — so we can't rely on
  // it to close the modal. Since this listener lives in the persistent (app)
  // layout (it doesn't unmount when the blend page mounts), clear on pathname
  // change instead. Works identically on web and native.
  useEffect(() => {
    setConnect(null)
  }, [pathname])

  useEffect(() => {
    if (!user?.id) return
    const me = user.id
    const supabase = createClient()
    let cancelled = false
    // De-dupe within a session so realtime + the mount catch-up (below) can't
    // both surface the same row, and a row can't re-pop after being shown.
    const shownIds = new Set<string>()

    /**
     * The scanner is identified by metadata.scanner_id (set on BOTH rows). We
     * celebrate only when THIS user was the one scanned (scanner ≠ me). The
     * scanner already gets the live "Connected" modal on the passport page, so
     * their own row must NOT re-pop here — hence we key strictly off
     * metadata.scanner_id (never sender_id, whose direction differs per row).
     */
    const scannerIdOf = (row: NotificationRow): string | null =>
      typeof row.metadata?.scanner_id === 'string'
        ? (row.metadata.scanner_id as string)
        : null

    /** Resolve the scanner, show the modal, and mark the row read (so it won't
     *  re-pop on the next app open / catch-up). Best-effort throughout. */
    const surface = async (row: NotificationRow & { id: string }) => {
      const scannerId = scannerIdOf(row)
      if (!scannerId || scannerId === me) return
      if (shownIds.has(row.id)) return
      shownIds.add(row.id)

      let scannerName = 'A traveler'
      let scannerUsername: string | null = null
      let scannerAvatarUrl: string | null = null
      try {
        const { data: scanner } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('id', scannerId)
          .maybeSingle()
        if (scanner) {
          scannerName = getDisplayName(scanner.display_name, scanner.username)
          scannerUsername = scanner.username ?? null
          scannerAvatarUrl = scanner.avatar_url ?? null
        }
      } catch (err) {
        log.error(
          'Failed to resolve passport scanner for connect modal',
          { component: 'PassportConnectListener', action: 'resolve-scanner' },
          err as Error,
        )
      }

      if (cancelled) return

      // Prefer the canonical blend link the notification already carries
      // (`/blend/<scanner>`); fall back to a username we resolved.
      // NativeNavigationAdapter rewrites this <Link> to the /blend/view twin
      // on Capacitor, so a canonical href is correct on every platform.
      const blendHref =
        row.link || (scannerUsername ? `/blend/${scannerUsername}` : '/followers')

      setConnect({ scannerId, scannerName, scannerUsername, scannerAvatarUrl, blendHref })

      // Seen via the modal → mark read so it doesn't re-surface via catch-up.
      void supabase.from('notifications').update({ is_read: true }).eq('id', row.id)
    }

    // 1. Live: pop the modal the instant a passport_connect arrives.
    const channel = supabase
      .channel('passport-connect')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${me}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow & { id: string }
          if (row.type !== 'passport_connect') return
          void surface(row)
        },
      )
      .subscribe()

    // 2. Catch-up: realtime only delivers events while subscribed, so if the
    //    owner's app was closed/backgrounded at the scan instant they'd miss
    //    the modal. On mount, surface the most recent UNREAD, RECENT
    //    passport_connect once, so reopening the app shortly after still pulls
    //    the owner into the blend. Bounded to 5 min so we never pop a stale one.
    const RECENT_MS = 5 * 60 * 1000
    void (async () => {
      try {
        const sinceIso = new Date(Date.now() - RECENT_MS).toISOString()
        const { data } = await supabase
          .from('notifications')
          .select('id, sender_id, type, link, metadata')
          .eq('user_id', me)
          .eq('type', 'passport_connect')
          .eq('is_read', false)
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(5)
        if (cancelled || !data) return
        // First unread one that was scanned by someone else (not our own row).
        const mine = (data as (NotificationRow & { id: string })[]).find(
          (r) => scannerIdOf(r) && scannerIdOf(r) !== me,
        )
        if (mine) void surface(mine)
      } catch {
        /* best-effort — realtime covers the live case */
      }
    })()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const viewerName = getDisplayName(profile?.display_name, profile?.username) || 'You'

  return (
    <AnimatePresence>
      {connect && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="New travel connection"
          onClick={() => setConnect(null)}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-2xl"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Both accounts */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <Avatar className="size-16 ring-2 ring-background shadow">
                <AvatarImage
                  src={getAvatarUrl(connect.scannerAvatarUrl, connect.scannerUsername ?? undefined)}
                  alt={connect.scannerName}
                />
                <AvatarFallback className="bg-olive-200 text-olive-800 font-semibold">
                  {getDisplayInitial(connect.scannerName, connect.scannerUsername ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-coral)] text-white shadow-md">
                <UserCheck className="size-4" />
              </span>
              <Avatar className="size-16 ring-2 ring-background shadow">
                <AvatarImage
                  src={getAvatarUrl(profile?.avatar_url, profile?.username)}
                  alt={viewerName}
                />
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                  {getDisplayInitial(profile?.display_name, profile?.username)}
                </AvatarFallback>
              </Avatar>
            </div>

            <p className="al-eyebrow mb-1 inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-[color:var(--color-coral)]" />
              New connection
            </p>
            <h2 className="al-display text-2xl mb-1.5">
              {connect.scannerName} scanned your passport
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              You and{' '}
              <span className="font-semibold text-foreground">{connect.scannerName}</span>{' '}
              now follow each other — see where your journeys overlap.
            </p>

            <Link
              href={connect.blendHref}
              onClick={() => setConnect(null)}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-[color:var(--color-coral)] text-white font-semibold px-5 py-3 shadow-lg transition-transform active:scale-[0.98]"
            >
              See your Travel Blend
              <ArrowRight className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => setConnect(null)}
              className="mt-3 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
