'use client'

/**
 * App-shell scroll helpers.
 *
 * The authenticated app uses a *locked* shell: the header and bottom tab bar
 * are pinned to the viewport edges and only the middle region scrolls. That
 * scroll region is the element with id `app-scroll` (see `(app)/layout.tsx`).
 *
 * Because the window itself no longer scrolls inside the app shell, any code
 * that used `window.scrollY` / `window.scrollTo` must target that element
 * instead. These helpers centralise that lookup and fall back to the window
 * on pages that are NOT inside the locked shell (marketing / public routes),
 * so they're safe to call from shared components.
 */

export const APP_SCROLL_ID = 'app-scroll'

/** The locked scroll region, or null when not on an app-shell page. */
export function getAppScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(APP_SCROLL_ID)
}

/** Current vertical scroll offset of the app shell (falls back to window). */
export function getAppScrollTop(): number {
  const el = getAppScroller()
  if (el) return el.scrollTop
  return typeof window !== 'undefined' ? window.scrollY : 0
}

/** Scroll the app shell to a vertical offset (falls back to window). */
export function scrollAppTo(top: number, behavior: ScrollBehavior = 'auto'): void {
  const el = getAppScroller()
  if (el) {
    el.scrollTo({ top, behavior })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top, behavior })
  }
}

/**
 * Subscribe to scroll on whichever surface is actually scrolling. Returns an
 * unsubscribe function. No-ops gracefully during SSR.
 */
export function onAppScroll(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const target: HTMLElement | Window = getAppScroller() ?? window
  target.addEventListener('scroll', handler, { passive: true })
  return () => target.removeEventListener('scroll', handler)
}
