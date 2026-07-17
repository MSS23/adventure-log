import { Preferences } from '@capacitor/preferences'
import { Platform } from './platform'
import { log } from './logger'
import { clearQueue as clearPwaQueue } from './offline-queue'
import { clearQueue as clearActionQueue } from '@/lib/offline/queue'
import { clearOfflineData } from '@/lib/offline/storage'

const NATIVE_OFFLINE_KEYS = [
  'adventure-log-offline-albums',
  'adventure-log-offline-photos',
  'al_offline_queue_v1',
]

/** Remove account-specific browser/native data before another user signs in. */
export async function clearPrivateDeviceData(): Promise<void> {
  const tasks: Promise<unknown>[] = []

  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PRIVATE_DATA' })
  }

  if (typeof caches !== 'undefined') {
    tasks.push(caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))))
  }

  if (Platform.isWeb()) {
    tasks.push(clearPwaQueue('albums'), clearPwaQueue('photos'), clearActionQueue(), clearOfflineData())
  } else {
    tasks.push(...NATIVE_OFFLINE_KEYS.map((key) => Preferences.remove({ key })))
  }

  const results = await Promise.allSettled(tasks)
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length > 0) {
    log.warn('Some private device data could not be cleared', {
      component: 'private-device-data',
      action: 'clear',
      failures: failures.length,
    })
  }
}
