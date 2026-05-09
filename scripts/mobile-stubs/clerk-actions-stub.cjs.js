/**
 * MOBILE STUB (CommonJS variant) — see clerk-actions-stub.js for the rationale.
 *
 * This file uses CommonJS exports so it's a drop-in for Clerk's CJS bundles
 * under node_modules/@clerk/nextjs/dist/cjs/app-router/. The ESM variant
 * (clerk-actions-stub.js) is used for the dist/esm/ paths.
 *
 * IMPORTANT: NO `'use server'` directive at the top of this file. That's the
 * whole point of the stub — make Next.js see plain async functions instead
 * of server-action references.
 */
'use strict'

async function invalidateCacheAction() {}
async function syncKeylessConfigAction() { return null }
async function deleteKeylessAction() {}
async function createOrReadKeylessAction() { return null }

module.exports = {
  invalidateCacheAction,
  syncKeylessConfigAction,
  deleteKeylessAction,
  createOrReadKeylessAction,
}
