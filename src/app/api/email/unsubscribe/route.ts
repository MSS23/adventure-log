import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyUnsubscribe } from '@/lib/utils/unsubscribe'
import { validationPatterns } from '@/lib/config/security'
import { rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'

/**
 * /api/email/unsubscribe?uid=<userId>&sig=<hmac>
 *
 * Unauthenticated by design (allowlisted in middleware) — it's used from an
 * email client with no app session. The HMAC signature is the authorization.
 *
 * GET renders a CONFIRMATION page whose button POSTs back; only POST mutates.
 * Corporate mail scanners (Outlook SafeLinks, Mimecast, …) GET-prefetch every
 * link in inbound mail, so a mutating GET would unsubscribe recipients the
 * moment an email arrives. POST also serves RFC 8058 List-Unsubscribe
 * one-click, which mail providers send server-side with no cookies.
 */

function htmlPage(title: string, bodyHtml: string, status = 200): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FAF7F1;color:#1c1917;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
.card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:40px 32px;max-width:420px;text-align:center}
h1{font-size:20px;margin:0 0 12px}p{color:#44403c;line-height:1.6;margin:0 0 8px}
button{background:#A2322B;color:#fff;border:0;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;cursor:pointer;margin-top:12px}</style></head>
<body><div class="card"><h1>${title}</h1>${bodyHtml}</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

function validateParams(request: NextRequest): { uid: string; sig: string } | null {
  const uid = request.nextUrl.searchParams.get('uid') || ''
  const sig = request.nextUrl.searchParams.get('sig') || ''
  if (!validationPatterns.uuid.test(uid) || !verifyUnsubscribe(uid, sig)) return null
  return { uid, sig }
}

const INVALID_LINK = htmlPage(
  'Invalid link',
  '<p>This unsubscribe link is invalid or has expired. You can manage email preferences from Settings inside the app.</p>',
  400
)

/** GET — confirmation page only. Scanners and prefetchers stop here. */
export async function GET(request: NextRequest) {
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.api, keyPrefix: 'email-unsubscribe' })
  if (!rl.success) return rateLimitResponse(rl.reset)

  const params = validateParams(request)
  if (!params) return INVALID_LINK

  return htmlPage(
    'Unsubscribe from emails?',
    `<p>You will no longer receive email notifications from Adventure Log (likes, comments, new followers).</p>
     <form method="POST" action="/api/email/unsubscribe?uid=${params.uid}&amp;sig=${params.sig}">
       <button type="submit">Unsubscribe</button>
     </form>`
  )
}

/** POST — performs the unsubscribe (confirm-page form + RFC 8058 one-click). */
export async function POST(request: NextRequest) {
  const rl = await rateLimitAsync(request, { ...rateLimitConfigs.api, keyPrefix: 'email-unsubscribe' })
  if (!rl.success) return rateLimitResponse(rl.reset)

  const params = validateParams(request)
  if (!params) return INVALID_LINK

  if (!supabaseAdmin) {
    return htmlPage('Temporarily unavailable', '<p>We could not process your request right now. Please try again later or use Settings inside the app.</p>', 503)
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ email_notifications: false })
    .eq('id', params.uid)

  if (error) {
    log.error('Unsubscribe update failed', { component: 'EmailUnsubscribe', action: 'update', userId: params.uid }, error)
    return htmlPage('Something went wrong', '<p>We could not process your request. Please try again later or use Settings inside the app.</p>', 500)
  }

  log.info('User unsubscribed from email notifications', { component: 'EmailUnsubscribe', action: 'unsubscribe', userId: params.uid })
  return htmlPage(
    'You are unsubscribed',
    '<p>You will no longer receive email notifications from Adventure Log. You can re-enable them anytime from Settings → Notifications.</p>'
  )
}
