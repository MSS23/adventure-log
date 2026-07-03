'use client'

/**
 * Native shell behaviors that need JS listeners (Capacitor only):
 *
 * 1. Android hardware back button — without a listener Capacitor falls back
 *    to WebView history and then *exits the activity*, which feels like a
 *    crash. Order of handling: close any open Radix dialog/menu first, then
 *    navigate back, then minimize (never exit).
 * 2. Status bar — style the icons to match the active theme so they are
 *    never invisible (the plugin is not configured anywhere natively).
 *
 * Renders nothing; inert on web and during SSR.
 */

import { useEffect } from 'react'
import { isNativePlatform } from '@/lib/api/client'
import { log } from '@/lib/utils/logger'

export function NativeAppShell() {
  // Android back button
  useEffect(() => {
    if (!isNativePlatform()) return
    let cleanup: (() => void) | undefined

    ;(async () => {
      try {
        const { App } = await import('@capacitor/app')
        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          // 1) An open overlay (Radix dialog/dropdown/popover) should close
          //    instead of navigating. Radix closes on Escape.
          const openOverlay = document.querySelector(
            '[role="dialog"][data-state="open"], [role="menu"][data-state="open"]'
          )
          if (openOverlay) {
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
            )
            return
          }
          // 2) Normal in-app back navigation.
          if (canGoBack && window.history.length > 1) {
            window.history.back()
            return
          }
          // 3) At the navigation root: background the app, never exit it.
          App.minimizeApp().catch(() => {})
        })
        cleanup = () => {
          handle.remove()
        }
      } catch (err) {
        log.error('Failed to install native back-button handler', {
          component: 'NativeAppShell',
          action: 'backButton',
        }, err instanceof Error ? err : new Error(String(err)))
      }
    })()

    return () => cleanup?.()
  }, [])

  // Status bar style follows the app theme (light/dark class on <html>).
  useEffect(() => {
    if (!isNativePlatform()) return
    let observer: MutationObserver | undefined

    ;(async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')

        const apply = async () => {
          const dark = document.documentElement.classList.contains('dark')
          // Style.Dark = light icons on dark background; Style.Light = the
          // inverse. Match the theme background colors from layout viewport.
          await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
          try {
            await StatusBar.setBackgroundColor({ color: dark ? '#0C1014' : '#F7F9FB' })
          } catch {
            // setBackgroundColor is Android-only; ignore elsewhere.
          }
        }

        await apply()
        observer = new MutationObserver(() => {
          void apply()
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      } catch (err) {
        log.error('Failed to configure native status bar', {
          component: 'NativeAppShell',
          action: 'statusBar',
        }, err instanceof Error ? err : new Error(String(err)))
      }
    })()

    return () => observer?.disconnect()
  }, [])

  return null
}
