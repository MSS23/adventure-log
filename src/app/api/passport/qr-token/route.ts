import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mintPassportQrToken } from '@/lib/server/passport-qr-token'
import { log } from '@/lib/utils/logger'

/**
 * GET /api/passport/qr-token
 *
 * Mints a short-lived (15 min) signed token bound to the authenticated user,
 * for embedding in their on-screen passport QR code (`&t=<token>`). Scanning
 * that QR and presenting the token to POST /api/passport/connect proves an
 * in-person scan of THIS owner's QR, which is what authorizes the immediate
 * mutual-accepted connect even for private/friends accounts.
 *
 * The token must ride ONLY in the QR image — never in copy-link or
 * share-sheet URLs, which are long-lived.
 *
 * Response: 200 { token: string } | 401 | 500
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = mintPassportQrToken(user.id)
    if (!token) {
      // Signing key derives from SUPABASE_SERVICE_ROLE_KEY — absence is a
      // server misconfiguration, not a client error.
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    return NextResponse.json({ token })
  } catch (err) {
    log.error('Passport QR token mint failed', {
      component: 'PassportQrToken',
      action: 'mint',
    }, err as Error)
    return NextResponse.json({ error: 'Token mint failed' }, { status: 500 })
  }
}
