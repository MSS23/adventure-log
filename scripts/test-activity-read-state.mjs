/**
 * Empirical RLS test for activity_feed read-state persistence.
 *
 * Creates two throwaway users (actor B, recipient A), inserts activity rows,
 * signs in as A, and verifies:
 *   1. Which rows A can SELECT (notifications targeted at A? A's own actions?
 *      followed users' actions?)
 *   2. Whether A's UPDATE { is_read: true } actually persists (the bug:
 *      optimistic UI says read, but on revisit the dot comes back).
 *
 * Cleans up everything it creates. Run:
 *   node scripts/test-activity-read-state.mjs
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

const svc = (path, init = {}) =>
  fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

async function createUser(email) {
  const res = await svc('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Test-12345-pass!', email_confirm: true }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`createUser ${email}: ${JSON.stringify(body)}`)
  return body.id
}

async function main() {
  const stamp = process.argv[2] || 'rlscheck'
  const cleanup = []
  try {
    // 1. Create users
    const aId = await createUser(`${stamp}-recipient@example.com`)
    const bId = await createUser(`${stamp}-actor@example.com`)
    cleanup.push(async () => svc(`/auth/v1/admin/users/${aId}`, { method: 'DELETE' }))
    cleanup.push(async () => svc(`/auth/v1/admin/users/${bId}`, { method: 'DELETE' }))
    console.log('users created:', { aId, bId })

    // Ensure public.users profiles exist (trigger may or may not have run)
    for (const [id, name] of [[aId, 'recipient'], [bId, 'actor']]) {
      const r = await svc('/rest/v1/users', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id, username: `${stamp}_${name}`, email: `${stamp}-${name}@example.com` }),
      })
      if (!r.ok) console.log(`profile upsert ${name}:`, r.status, await r.text())
    }

    // 2. Insert activity rows via service role
    const rows = [
      // B followed A — a notification FOR A
      { user_id: bId, activity_type: 'user_followed', target_user_id: aId, is_read: false },
      // A's own action — no target
      { user_id: aId, activity_type: 'album_created', target_user_id: null, is_read: false },
      // B's own action, not targeting A (A does NOT follow B)
      { user_id: bId, activity_type: 'album_created', target_user_id: null, is_read: false },
    ]
    const insRes = await svc('/rest/v1/activity_feed', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(rows),
    })
    const inserted = await insRes.json()
    if (!insRes.ok) throw new Error(`insert: ${JSON.stringify(inserted)}`)
    const ids = inserted.map(r => r.id)
    cleanup.push(async () =>
      svc(`/rest/v1/activity_feed?id=in.(${ids.join(',')})`, { method: 'DELETE' })
    )
    console.log('inserted activity ids:', ids)
    const [notifId, ownId, unrelatedId] = ids

    // 3. Sign in as A
    const signin = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${stamp}-recipient@example.com`, password: 'Test-12345-pass!' }),
    })
    const session = await signin.json()
    if (!signin.ok) throw new Error(`signin: ${JSON.stringify(session)}`)
    const asA = (path, init = {}) =>
      fetch(`${URL_BASE}${path}`, {
        ...init,
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      })

    // 4. What can A see?
    const sel = await asA(`/rest/v1/activity_feed?id=in.(${ids.join(',')})&select=id,user_id,activity_type,target_user_id,is_read`)
    const visible = await sel.json()
    console.log('\n--- SELECT as recipient A ---')
    for (const id of ids) {
      const row = Array.isArray(visible) ? visible.find(v => v.id === id) : null
      const label = id === notifId ? 'notification targeted at A' : id === ownId ? "A's own action" : "unrelated user B's action"
      console.log(`${label}: ${row ? 'VISIBLE' : 'NOT visible'}`)
    }

    // 5. Can A mark the notification read? (the core bug)
    console.log('\n--- UPDATE is_read=true as A ---')
    for (const [id, label] of [[notifId, 'notification targeted at A'], [ownId, "A's own action"]]) {
      const upd = await asA(`/rest/v1/activity_feed?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ is_read: true }),
      })
      const updBody = await upd.json().catch(() => null)
      // verify with service role (ground truth)
      const truth = await (await svc(`/rest/v1/activity_feed?id=eq.${id}&select=is_read`)).json()
      console.log(`${label}: PATCH status=${upd.status}, rows returned=${Array.isArray(updBody) ? updBody.length : 'err'}, DB is_read now=${truth[0]?.is_read}`)
    }
  } finally {
    console.log('\ncleaning up...')
    for (const fn of cleanup.reverse()) {
      try { await fn() } catch (e) { console.log('cleanup error:', e.message) }
    }
    console.log('done')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
