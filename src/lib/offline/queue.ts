/**
 * Offline-safe write queue for trip pins, album photo adds, and any
 * fire-and-forget POST the user might initiate while on bad signal.
 *
 * Storage: Capacitor Preferences when available (native), localStorage
 * fallback (web). Per-device, per-user.
 *
 * Lifecycle:
 *   enqueue(action) → pushed to local queue
 *   processQueue() → POSTs each, drops succeeded, keeps failed for retry
 *   auto-triggered on 'online' event + on demand from the status pill
 *
 * This is intentionally a thin layer. Callers construct the `action`
 * payload and the queue just fires the configured endpoint on replay.
 */

const QUEUE_KEY = 'al_offline_queue_v1'

export interface QueuedAction {
  id: string
  endpoint: string
  method?: 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  label?: string // user-visible: "Kyoto pin", "3 photos"
  createdAt: number
  attempts: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

async function readQueue(): Promise<QueuedAction[]> {
  if (!isBrowser()) return []
  try {
    // Capacitor native preferences first
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    if (cap?.isNativePlatform?.()) {
      try {
        const mod = await import('@capacitor/preferences')
        const { value } = await mod.Preferences.get({ key: QUEUE_KEY })
        return value ? (JSON.parse(value) as QueuedAction[]) : []
      } catch {
        // fall through to localStorage
      }
    }
    const raw = window.localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedAction[]) : []
  } catch {
    return []
  }
}

async function writeQueue(q: QueuedAction[]): Promise<void> {
  if (!isBrowser()) return
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    const json = JSON.stringify(q)
    if (cap?.isNativePlatform?.()) {
      try {
        const mod = await import('@capacitor/preferences')
        await mod.Preferences.set({ key: QUEUE_KEY, value: json })
        return
      } catch {
        // fall through
      }
    }
    window.localStorage.setItem(QUEUE_KEY, json)
  } catch {
    // ignore
  }
}

export async function enqueueAction(
  action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>
): Promise<QueuedAction> {
  const full: QueuedAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    attempts: 0,
  }
  const queue = await readQueue()
  queue.push(full)
  await writeQueue(queue)
  notifyListeners()
  return full
}

export async function getQueue(): Promise<QueuedAction[]> {
  return readQueue()
}

export async function clearQueue(): Promise<void> {
  await writeQueue([])
  notifyListeners()
}

export async function processQueue(): Promise<{ sent: number; failed: number }> {
  if (!isBrowser() || !navigator.onLine) return { sent: 0, failed: 0 }
  const queue = await readQueue()
  if (queue.length === 0) return { sent: 0, failed: 0 }

  const remaining: QueuedAction[] = []
  let sent = 0
  let failed = 0

  for (const action of queue) {
    try {
      const res = await fetch(action.endpoint, {
        method: action.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action.body !== undefined ? JSON.stringify(action.body) : undefined,
      })
      if (res.ok) {
        sent++
      } else if (res.status === 401 || res.status === 403) {
        // auth issue — keep for retry later
        remaining.push({ ...action, attempts: action.attempts + 1 })
        failed++
      } else if (res.status >= 500) {
        // server error — retry
        remaining.push({ ...action, attempts: action.attempts + 1 })
        failed++
      } else {
        // 4xx client error — drop to avoid infinite retry
        failed++
      }
    } catch {
      remaining.push({ ...action, attempts: action.attempts + 1 })
      failed++
    }
    // Drop after 5 attempts to avoid forever-stuck queue
    if (remaining.length > 0 && remaining[remaining.length - 1].attempts >= 5) {
      remaining.pop()
    }
  }

  await writeQueue(remaining)
  notifyListeners()
  return { sent, failed }
}

// Listener pattern for the status indicator
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      // ignore
    }
  }
}

// Auto-process on reconnect
let installed = false
export function installOfflineQueue() {
  if (!isBrowser() || installed) return
  installed = true
  window.addEventListener('online', () => {
    processQueue()
  })
  // Also retry periodically while online (every 2 min)
  window.setInterval(() => {
    if (navigator.onLine) processQueue()
  }, 120_000)
}
