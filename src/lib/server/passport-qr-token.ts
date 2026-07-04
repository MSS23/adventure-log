import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed passport-QR connect tokens (SERVER-ONLY — imported by route handlers,
 * never by client components; it reads SUPABASE_SERVICE_ROLE_KEY-derived key
 * material via node:crypto).
 *
 * A token proves the scanner physically saw the OWNER's on-screen QR code
 * recently: the passport page mints it via GET /api/passport/qr-token and
 * embeds it in the QR only (never in copy/share links), and
 * POST /api/passport/connect verifies it before granting the privileged
 * "mutual accepted follow" path for private/friends accounts.
 *
 * Token wire format: `${exp}.${hmacHex}` where
 *   - exp     = unix SECONDS when the token expires (mint time + 15 min)
 *   - hmacHex = HMAC-SHA256(`${ownerUserId}.${exp}`, key) as lowercase hex
 *
 * Key derivation: SHA-256('passport-qr-v1:' + SUPABASE_SERVICE_ROLE_KEY).
 * No new env var needed; rotating the service-role key invalidates all
 * outstanding tokens, which is acceptable for a 15-minute-TTL credential.
 */

/** Token lifetime: long enough for an in-person scan, short enough to not be a durable capability. */
export const PASSPORT_QR_TOKEN_TTL_SECONDS = 15 * 60

/** Shape check for a candidate token before any crypto work. */
export const PASSPORT_QR_TOKEN_PATTERN = /^\d{1,12}\.[a-f0-9]{64}$/

function getSigningKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  return createHash('sha256').update(`passport-qr-v1:${secret}`).digest()
}

function computeHmacHex(ownerUserId: string, exp: number, key: Buffer): string {
  return createHmac('sha256', key).update(`${ownerUserId}.${exp}`).digest('hex')
}

/**
 * Mint a signed QR token for the given passport owner.
 * Returns null when the signing key material is unavailable (missing
 * SUPABASE_SERVICE_ROLE_KEY — a server misconfiguration).
 */
export function mintPassportQrToken(ownerUserId: string): string | null {
  const key = getSigningKey()
  if (!key) return null
  const exp = Math.floor(Date.now() / 1000) + PASSPORT_QR_TOKEN_TTL_SECONDS
  return `${exp}.${computeHmacHex(ownerUserId, exp, key)}`
}

/**
 * Verify a scanned QR token against the passport owner it claims to be for.
 * Constant-time signature comparison; rejects malformed shape, bad signature,
 * and expiry. Returns false (never throws) on any failure.
 */
export function verifyPassportQrToken(token: string, ownerUserId: string): boolean {
  if (typeof token !== 'string' || !PASSPORT_QR_TOKEN_PATTERN.test(token)) {
    return false
  }

  const key = getSigningKey()
  if (!key) return false

  const [expPart, providedHex] = token.split('.')
  const exp = Number(expPart)
  if (!Number.isSafeInteger(exp)) return false

  // Expired tokens are dead regardless of signature.
  if (exp < Math.floor(Date.now() / 1000)) return false

  const expectedHex = computeHmacHex(ownerUserId, exp, key)
  const provided = Buffer.from(providedHex, 'hex')
  const expected = Buffer.from(expectedHex, 'hex')
  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}
