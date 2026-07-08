/**
 * Retry a Supabase query on transient failure with capped exponential backoff.
 *
 * WHY: Supabase free-tier instances cold-start slowly after idle, so the FIRST
 * query on a surface frequently fails at the network layer ("TypeError: Failed
 * to fetch"), returns PGRST002 while PostgREST restarts, or hits a statement
 * timeout (57014). Any primary-surface query without in-place retry strands
 * its page on an error card until the user manually retries. The feed
 * (per-query React Query `retry: 5`) and the globe timeline (this helper) are
 * hardened; every other primary surface should use one of those two patterns.
 *
 * The builder must be constructed inside `build()` because a Supabase query
 * builder is a one-shot thenable — it can only be awaited once, so each
 * attempt needs a fresh builder.
 */
export async function runQueryWithRetry<T>(
  build: () => PromiseLike<{ data: T; error: unknown }>,
  {
    attempts = 3,
    baseDelayMs = 800,
    shouldRetry,
  }: {
    attempts?: number
    baseDelayMs?: number
    /**
     * Return false to stop retrying for a given error (e.g. PGRST116 "no
     * rows" on a .single() — a deleted record should 404 immediately, not
     * after the full backoff schedule). Defaults to retrying every error.
     */
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<{ data: T; error: unknown }> {
  let result: { data: T; error: unknown } = { data: null as T, error: new Error('query not run') }
  for (let attempt = 0; attempt < attempts; attempt++) {
    result = await build()
    if (!result.error) return result
    if (shouldRetry && !shouldRetry(result.error)) return result
    if (attempt < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** attempt))
    }
  }
  return result
}

/**
 * Errors that will never succeed on retry: the record genuinely doesn't
 * exist. Everything else (network failures, PGRST002 schema-cache restarts,
 * 57014 statement timeouts) is fair game for the cold-start backoff.
 */
export function isNoRowsError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null
  return err?.code === 'PGRST116' || !!err?.message?.includes('No rows')
}
