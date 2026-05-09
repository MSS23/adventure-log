/**
 * MOBILE STUB — replaces Clerk's server-action modules during MOBILE_BUILD.
 *
 * `@clerk/nextjs` ships these action files internally:
 *   - app-router/server-actions.js  → exports invalidateCacheAction
 *   - app-router/keyless-actions.js → exports syncKeylessConfigAction,
 *                                     deleteKeylessAction, createOrReadKeylessAction
 *
 * Each file has a `'use server'` directive at the top, which marks every
 * exported function as a Next.js server action. When `output: 'export'` is
 * enabled, Next.js refuses to build because its serverActionsManifest
 * contains entries (Clerk's actions) — even though our own actions are
 * stubbed and our pages don't call these directly.
 *
 * We aliased Clerk's two action files to this stub via webpack `resolve.alias`
 * in next.config.ts. The stub:
 *   - Has NO `'use server'` directive (so the bundled functions are plain
 *     async functions, not server actions, and don't show up in the
 *     serverActionsManifest).
 *   - Exports the same names so any caller in Clerk's runtime resolves them.
 *   - No-ops at runtime — these actions exist for cache invalidation and
 *     dev-mode keyless setup, neither of which apply to a static-exported
 *     mobile bundle. Cache invalidation happens server-side on the deployed
 *     web app; keyless mode requires a Next.js server.
 *
 * If a Clerk feature breaks on mobile because of these no-ops, port the
 * affected code to call the deployed `/api/*` endpoints via apiFetch().
 */

export async function invalidateCacheAction() {
  // No-op: cache invalidation is a server concern; the mobile bundle is
  // static and has no per-route cache to invalidate.
}

export async function syncKeylessConfigAction() {
  // No-op: keyless mode is unavailable in static export.
  return null
}

export async function deleteKeylessAction() {
  // No-op: keyless mode is unavailable in static export.
}

export async function createOrReadKeylessAction() {
  // No-op: keyless mode is unavailable in static export.
  return null
}
