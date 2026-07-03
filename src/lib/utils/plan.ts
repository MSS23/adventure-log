/**
 * Pro plan helpers (minimal scaffold — no billing SDK, no lifecycle).
 *
 * `users.plan` is 'free' | 'pro' (migration 69), flipped manually or by a
 * payment webhook. Callers should tolerate the column not existing yet
 * (Postgres error 42703) and treat that as 'free'.
 */
export function isPro(profile: { plan?: string | null } | null | undefined): boolean {
  return profile?.plan === 'pro'
}
