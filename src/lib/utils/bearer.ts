import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time comparison of an HTTP `Authorization: Bearer <secret>` header
 * against an expected secret.
 *
 * The naive `header === \`Bearer ${secret}\`` check leaks length and
 * character-by-character timing — an attacker on the same network (or a noisy
 * neighbor on shared hosting) can use the timing delta to brute-force the
 * secret one byte at a time. `timingSafeEqual` masks the comparison so every
 * call takes the same wall-clock duration regardless of where the first
 * mismatch occurs.
 *
 * Returns false (not throws) for missing header, missing secret, wrong prefix,
 * or length mismatch. Length-mismatch must short-circuit because
 * `timingSafeEqual` itself throws on unequal-length buffers; we eat that
 * outcome and return false to keep callers simple.
 *
 * Usage from a route handler:
 *
 *   import { verifyBearer } from '@/lib/utils/bearer'
 *
 *   if (!verifyBearer(request.headers.get('authorization'), process.env.CRON_SECRET)) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 */
export function verifyBearer(
  headerValue: string | null,
  secret: string | undefined,
): boolean {
  if (!headerValue || !secret) return false
  const prefix = 'Bearer '
  if (!headerValue.startsWith(prefix)) return false
  return timingSafeStringEqual(headerValue.slice(prefix.length), secret)
}

/**
 * Constant-time string equality for secrets and signatures (bearer tokens,
 * HMAC hex digests). See the timing-attack rationale above.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  // timingSafeEqual throws if buffers differ in length. Short-circuiting on
  // length still leaks length, but secret/signature lengths are constants
  // anyway — no incremental information disclosed.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
