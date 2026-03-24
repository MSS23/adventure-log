import { log } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/client'

/**
 * Push notification service using Web Push API (VAPID).
 *
 * Setup:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in env
 * 3. Set VAPID_PRIVATE_KEY in server env
 * 4. Run migration to create push_subscriptions table
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Check if push notifications are supported */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Check if VAPID is configured */
export function isPushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY
}

/** Get current permission status */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** Request push notification permission and subscribe */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    log.warn('Push not supported or VAPID not configured', { component: 'PushService' })
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      log.info('Push permission denied', { component: 'PushService' })
      return false
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    // Save subscription to database
    const supabase = createClient()
    const subscriptionJSON = subscription.toJSON()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh,
        auth: subscriptionJSON.keys?.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      })

    if (error) {
      log.error('Failed to save push subscription', { component: 'PushService' }, error)
      return false
    }

    log.info('Push subscription saved', { component: 'PushService', userId })
    return true
  } catch (err) {
    log.error('Push subscription failed', { component: 'PushService' }, err as Error)
    return false
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Remove from database
      const supabase = createClient()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
    }

    log.info('Push unsubscribed', { component: 'PushService', userId })
    return true
  } catch (err) {
    log.error('Push unsubscribe failed', { component: 'PushService' }, err as Error)
    return false
  }
}

/** Check if user is subscribed to push */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
