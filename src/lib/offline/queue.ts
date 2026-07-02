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

// In-flight guard: the 'online' listener, the 2-min interval and manual taps
// from the status pill can all fire at once — without this, concurrent runs
// read the same queue and double-send every action.
let inFlight: Promise<{ sent: number; failed: number }> | null = null

export async function processQueue(): Promise<{ sent: number; failed: number }> {
  if (inFlight) return inFlight
  inFlight = processQueueInternal().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function processQueueInternal(): Promise<{ sent: number; failed: number }> {
  if (!isBrowser() || !navigator.onLine) return { sent: 0, failed: 0 }
  const queue = await readQueue()
  if (queue.length === 0) return { sent: 0, failed: 0 }

  // Track outcomes by id instead of building a "remaining" snapshot: actions
  // enqueued while this run is fetching must survive the final write.
  const removedIds = new Set<string>() // sent OK, non-retryable 4xx, or out of retries
  const retryIds = new Set<string>() // failed — keep with attempts + 1
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
        removedIds.add(action.id)
      } else if (res.status === 401 || res.status === 403) {
        // auth issue — leave queued untouched (no attempts bump) so the action
        // isn't dropped by the retry cap before the session comes back
        failed++
      } else if (res.status >= 500) {
        // server error — retry, but drop once the attempt budget is spent
        // to avoid a forever-stuck queue
        failed++
        if (action.attempts + 1 >= 5) removedIds.add(action.id)
        else retryIds.add(action.id)
      } else {
        // 4xx client error — drop to avoid infinite retry
        failed++
        removedIds.add(action.id)
      }
    } catch {
      failed++
      if (action.attempts + 1 >= 5) removedIds.add(action.id)
      else retryIds.add(action.id)
    }
  }

  // Re-read storage and remove ONLY the processed ids — overwriting with the
  // pre-run snapshot silently deleted anything enqueued during processing.
  const current = await readQueue()
  const next = current
    .filter((a) => !removedIds.has(a.id))
    .map((a) => (retryIds.has(a.id) ? { ...a, attempts: a.attempts + 1 } : a))
  await writeQueue(next)
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
