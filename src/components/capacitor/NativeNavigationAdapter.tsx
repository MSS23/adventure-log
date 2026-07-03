'use client'

/**
 * Native-only navigation adapter.
 *
 * On Capacitor, dynamic detail routes (/albums/[id], /profile/[userId], ...)
 * are not in the static bundle — see src/lib/utils/native-routes.ts. Rather
 * than editing every one of the ~90 <Link> call sites, this component installs
 * a single capture-phase click listener that rewrites those navigations to
 * their in-bundle query-param twins before Next.js Link handles the click.
 *
 * Next's <Link> onClick bails out when `event.defaultPrevented` is set, so
 * preventDefault + router.push is enough to take over the navigation.
 *
 * Renders nothing; inert on web and during SSR.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativePlatform } from '@/lib/api/client'
import { mapPathForNative } from '@/lib/utils/native-routes'

export function NativeNavigationAdapter() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePlatform()) return

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      // Only plain left-clicks; let modified clicks behave natively.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      // Only same-app paths need mapping; absolute/hash/mail links pass through.
      if (!href || !href.startsWith('/')) return

      const mapped = mapPathForNative(href)
      if (mapped.href === href && !mapped.external) return

      event.preventDefault()
      event.stopPropagation()

      if (mapped.external) {
        // Origins outside capacitor.config.ts allowNavigation are handed to
        // the system browser by the WebView.
        window.open(mapped.href, '_blank', 'noopener')
      } else {
        router.push(mapped.href)
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router])

  return null
}
