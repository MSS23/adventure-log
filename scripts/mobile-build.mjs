#!/usr/bin/env node
/**
 * Mobile build orchestrator (Capacitor static export).
 *
 * Why this script exists
 * ──────────────────────
 * Next.js 15.x's `output: 'export'` is project-wide and refuses to build any
 * file that needs a server runtime:
 *   - route handlers under `src/app/api/**` (38 routes)
 *   - server actions (`'use server'` files in src/app/actions/ and (app)/.../actions.ts)
 *   - `runtime = 'edge'` OG image generators (opengraph-image.tsx, twitter-image.tsx)
 *   - `src/middleware.ts` (Supabase session middleware needs an active server)
 *   - root `instrumentation.ts` (Sentry server bootstrap)
 *
 * Next.js does NOT (as of 15.5.x) provide a per-route `excludeFromExport` knob
 * or a `pageExtensions`-style filter that's evaluated AFTER routing. The
 * realistic options are:
 *   (A) Maintain two parallel project directories — invasive, doubles the
 *       maintenance surface, breaks shared imports.
 *   (B) Temporarily relocate the offending files at build time, then restore
 *       them once the build completes — what this script does.
 *   (C) Conditional `export const dynamic` / `dynamicParams` — doesn't help,
 *       static export still rejects route handlers entirely.
 *
 * (B) was chosen because it keeps the source tree intact, requires no
 * conditional imports, and the rename is fully reversible (we restore in a
 * `finally` block so even SIGINT/build crashes don't strand renamed files).
 *
 * What it does
 * ────────────
 *   1. For every path in `MOBILE_EXCLUDE_GLOBS`, rename the file/dir to
 *      `<original>.mobile-skip` so Next's router never sees it.
 *   2. Run `next build` with `MOBILE_BUILD=true` so next.config.ts switches to
 *      `output: 'export'`.
 *   3. Restore every renamed file/dir, regardless of build outcome.
 *
 * The renames are tracked in `.mobile-build-renames.json` at the project root
 * (git-ignored — see comment at end of file). On startup we check for that
 * file and restore from a previous interrupted run before doing anything else,
 * so a Ctrl+C'd build never leaves the working tree in a broken state for the
 * next invocation.
 *
 * The Capacitor WebView calls back to the deployed web URL for /api/* via the
 * apiFetch() helper (see src/lib/api/client.ts). The deployed URL is read from
 * NEXT_PUBLIC_API_BASE_URL at build time.
 */

import { spawn } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
  copyFileSync,
} from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, rm } from 'node:fs/promises'
import { config as loadEnv } from 'dotenv'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '..')
const RENAMES_FILE = join(ROOT, '.mobile-build-renames.json')
const SUFFIX = '.mobile-skip'

// Next.js loads .env.local inside its own process, but this orchestrator also
// needs the values so it can validate NEXT_PUBLIC_API_BASE_URL and forward the
// same environment to the static-export child process.
loadEnv({ path: join(ROOT, '.env.local'), quiet: true })

/**
 * Path patterns to take out of the build entirely. Matches are evaluated
 * relative to the project root.
 *
 * Anything that requires a server runtime, an Edge runtime, or middleware AND
 * is not imported by client/UI code goes here. Pure metadata files like
 * `sitemap.ts` and `robots.ts` stay — sitemap.ts already has a MOBILE_BUILD
 * branch that returns static pages and `dynamic = 'force-static'`.
 */
const MOBILE_REMOVE_PATTERNS = [
  // All API route handlers — can't be statically exported. Some routes use
  // .tsx (e.g. /api/travel-card uses ImageResponse JSX), so we match both.
  'src/app/api/**/route.ts',
  'src/app/api/**/route.tsx',
  // Non-API route handlers (OAuth callback) — also can't be statically exported.
  'src/app/auth/callback/route.ts',
  // OG image routes use `runtime = 'edge'` and dynamically render.
  'src/app/opengraph-image.tsx',
  'src/app/twitter-image.tsx',
  // Supabase session middleware and instrumentation — server-only.
  'src/middleware.ts',
  'instrumentation.ts',
  // ────────────────────────────────────────────────────────────────────
  // Dynamic page routes — `output: 'export'` requires every dynamic page
  // to declare `generateStaticParams()`, but our pages are `'use client'`
  // and can't host that export, so they stay excluded from the bundle.
  //
  // Each detail view now has a STATIC query-param twin that DOES ship
  // (the page bodies were extracted into shared components):
  //   /albums/[id]          → /albums/view?id=      (AlbumDetailView)
  //   /albums/[id]/edit     → /albums/edit?id=      (AlbumEditView)
  //   /albums/[id]/upload   → /albums/upload?id=    (UploadPhotosView)
  //   /profile/[userId]     → /profile/view?u=      (UserProfileView)
  //   /trips/[id]           → /trips/view?id=       (TripDetailView)
  //   /places/[slug]        → /places/view?slug=    (LocationFeedView)
  //   /blend/[username]     → /blend/view?u=        (BlendContent)
  //   /u/[username]/passport → /passport/view?u=    (PublicPassportContent)
  // On native, NativeNavigationAdapter rewrites <a> clicks to the twins and
  // programmatic navigations go through localizePath() — see
  // src/lib/utils/native-routes.ts. When adding a NEW dynamic route, add it
  // here AND give it a twin + mapping there.
  //
  // Still web-only (opened in the system browser on native): /embed/*,
  // /t/[slug], /albums/shared/[token], /albums/[id]/public.
  // ────────────────────────────────────────────────────────────────────
  'src/app/(app)/albums/[id]/page.tsx',
  'src/app/(app)/albums/[id]/edit/page.tsx',
  'src/app/(app)/albums/[id]/upload/page.tsx',
  'src/app/(app)/blend/[username]/page.tsx',
  'src/app/(app)/places/[slug]/page.tsx',
  'src/app/(app)/profile/[userId]/page.tsx',
  'src/app/(app)/trips/[id]/page.tsx',
  'src/app/(embed)/embed/[username]/page.tsx',
  'src/app/(public)/albums/shared/[token]/page.tsx',
  'src/app/(public)/albums/[id]/public/page.tsx',
  'src/app/(public)/t/[slug]/page.tsx',
  'src/app/(public)/u/[username]/page.tsx',
  'src/app/(public)/u/[username]/passport/page.tsx',
  // Optional catch-all auth routes — `output: 'export'` requires
  // generateStaticParams() on dynamic routes, which these backward-compat
  // redirect shims don't provide. They just bounce old /sign-in and /sign-up
  // links to the canonical Supabase /login and /signup routes.
  'src/app/sign-in/[[...sign-in]]/page.tsx',
  'src/app/sign-up/[[...sign-up]]/page.tsx',
  // ────────────────────────────────────────────────────────────────────
  // Core surfaces dashboard / saved / countries / profile / wishlist and the
  // /login page are now CLIENT-ONLY, so they static-export and ship in the
  // mobile bundle. dashboard/saved/countries were already trivial client
  // wrappers; profile/page.tsx and wishlist/page.tsx were converted from
  // Supabase-server-client pages to client-only pages (their *Content
  // components already fetch their own data via the client Supabase, which on
  // native reads the session stored by the Capacitor Preferences adapter).
  // login/page.tsx was always a pure client sign-in form — omitting it is what
  // broke sign-in on the APK (tapping "Sign In" went to a page not in the
  // bundle). Do NOT re-add these here without a reason.
  //
  // Still omitted (need generateStaticParams / are genuinely dynamic): the
  // [id]/[username]/[slug] detail routes above.
  // ────────────────────────────────────────────────────────────────────
]

/**
 * Files that are imported by client/UI code AND can't be statically exported
 * (server actions, mostly). We can't just delete them — imports would fail.
 * We instead temporarily swap them with stub modules under
 * `scripts/mobile-stubs/` that export the same symbols. The originals are
 * restored on build completion.
 *
 * The mobile UI shouldn't call our own stubbed actions; the stub error
 * message tells the developer to wire the call through `apiFetch()` instead.
 *
 * Each entry: { original: <path>, stub: <path-in-mobile-stubs/> }
 * Both are project-root-relative.
 */
const MOBILE_STUB_REPLACEMENTS = [
  // Our own server actions
  {
    original: 'src/app/actions/achievements.ts',
    stub: 'scripts/mobile-stubs/achievements.ts',
  },
  {
    original: 'src/app/actions/album-sharing.ts',
    stub: 'scripts/mobile-stubs/album-sharing.ts',
  },
  {
    original: 'src/app/actions/photo-metadata.ts',
    stub: 'scripts/mobile-stubs/photo-metadata.ts',
  },
  {
    original: 'src/app/(app)/albums/actions.ts',
    stub: 'scripts/mobile-stubs/app-albums-actions.ts',
  },
  {
    original: 'src/app/(app)/albums/[id]/actions.ts',
    stub: 'scripts/mobile-stubs/app-albums-id-actions.ts',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Glob helpers — minimal recursive walk + pattern match.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tiny glob matcher. Supports `**`, `*`, and `?`. Sufficient for our patterns
 * (route.ts under nested API dirs). Not a full glob implementation — keep
 * patterns simple.
 */
function globToRegex(pattern) {
  // Escape regex special chars EXCEPT *, ?, /
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  // Replace ** with placeholder, * with [^/]*, ? with [^/], then restore **.
  const re = escaped
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/<<DOUBLESTAR>>/g, '.*')
  return new RegExp(`^${re}$`)
}

async function walk(dir, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'out' || entry.name === '.git') {
      continue
    }
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, results)
    } else {
      results.push(full)
    }
  }
  return results
}

async function expandPatterns(patterns) {
  // Split: literal paths can be returned directly; globs need a tree walk.
  const matches = new Set()
  const literals = patterns.filter((p) => !p.includes('*') && !p.includes('?'))
  const globs = patterns.filter((p) => p.includes('*') || p.includes('?'))

  for (const lit of literals) {
    const abs = join(ROOT, lit)
    if (existsSync(abs)) matches.add(abs)
  }

  if (globs.length > 0) {
    const allFiles = await walk(ROOT)
    const regexes = globs.map((p) => globToRegex(p))
    for (const file of allFiles) {
      const rel = relative(ROOT, file).replace(/\\/g, '/')
      if (regexes.some((re) => re.test(rel))) {
        matches.add(file)
      }
    }
  }

  return Array.from(matches).sort()
}

// ────────────────────────────────────────────────────────────────────────────
// Rename / restore lifecycle
// ────────────────────────────────────────────────────────────────────────────

function persistRenames(renames) {
  writeFileSync(RENAMES_FILE, JSON.stringify(renames, null, 2))
}

function clearRenamesFile() {
  if (existsSync(RENAMES_FILE)) unlinkSync(RENAMES_FILE)
}

function readRenames() {
  if (!existsSync(RENAMES_FILE)) return []
  try {
    return JSON.parse(readFileSync(RENAMES_FILE, 'utf8'))
  } catch {
    return []
  }
}

/**
 * Restore any files renamed by a previous (possibly interrupted) build before
 * starting a new one. Idempotent — silently skips entries whose `.mobile-skip`
 * sibling no longer exists. Calls the same `restore()` used by the main path
 * so stub cleanup is identical.
 */
function restorePrevious() {
  const previous = readRenames()
  if (previous.length === 0) return
  console.log(
    `[mobile-build] Restoring ${previous.length} file(s) from previous interrupted run...`,
  )
  // Filter to entries that actually need restoring — skipped exists.
  const recoverable = previous.filter((e) => existsSync(e.skipped))
  // Warn about conflicts where both original and skipped exist (not a stub
  // case — for stubs, having both is expected mid-build).
  for (const e of previous) {
    if (e.kind !== 'stub' && existsSync(e.skipped) && existsSync(e.original)) {
      console.warn(
        `[mobile-build] Both ${e.original} and ${e.skipped} exist. Will overwrite ${e.original}.`,
      )
    }
  }
  restore(recoverable)
}

/**
 * Apply the build-time mutations. For each "remove" path, rename it to
 * `<path>.mobile-skip`. For each "stub" replacement, rename the original
 * to `.mobile-skip` AND copy the stub into the original's place.
 *
 * Returns the journal that `restore()` uses to undo everything.
 */
function applyMutations(removes, stubs) {
  const journal = []

  for (const original of removes) {
    const skipped = `${original}${SUFFIX}`
    if (existsSync(skipped)) {
      throw new Error(
        `Refusing to rename ${original}: ${skipped} already exists. Resolve manually.`,
      )
    }
    renameSync(original, skipped)
    journal.push({ kind: 'remove', original, skipped })
    persistRenames(journal)
  }

  for (const { original, stub } of stubs) {
    const skipped = `${original}${SUFFIX}`
    if (!existsSync(original)) {
      throw new Error(
        `Refusing to stub ${original}: file does not exist (already moved?).`,
      )
    }
    if (!existsSync(stub)) {
      throw new Error(`Stub file missing: ${stub}`)
    }
    if (existsSync(skipped)) {
      throw new Error(
        `Refusing to stub ${original}: ${skipped} already exists. Resolve manually.`,
      )
    }
    renameSync(original, skipped)
    copyFileSync(stub, original)
    journal.push({ kind: 'stub', original, skipped })
    persistRenames(journal)
  }

  return journal
}

function restore(journal) {
  // Restore in reverse order so stubs get cleaned up before any potential
  // dependent files. (Order doesn't really matter today, but it's the right
  // habit when restoring filesystem state.)
  for (const entry of [...journal].reverse()) {
    const { kind, original, skipped } = entry
    if (kind === 'stub') {
      // Delete the stub copy that's currently sitting at `original`, then
      // rename the saved original back into place.
      try {
        if (existsSync(original)) unlinkSync(original)
      } catch (err) {
        console.error(`[mobile-build] FAILED to remove stub at ${original}:`, err.message)
      }
      if (existsSync(skipped)) {
        try {
          renameSync(skipped, original)
        } catch (err) {
          console.error(`[mobile-build] FAILED to restore ${original} — file is at ${skipped}`)
          console.error(err)
        }
      }
    } else {
      // Plain rename restore.
      if (!existsSync(skipped)) continue
      try {
        renameSync(skipped, original)
      } catch (err) {
        console.error(`[mobile-build] FAILED to restore ${original} — file is at ${skipped}`)
        console.error(err)
      }
    }
  }
  clearRenamesFile()
}

// ────────────────────────────────────────────────────────────────────────────
// Build runner
// ────────────────────────────────────────────────────────────────────────────

function runNextBuild() {
  return new Promise((resolveP, rejectP) => {
    // Invoke Next's JS entrypoint with the current Node binary instead of the
    // .bin/next.cmd shim: shell:true routes through cmd.exe, which parses
    // unquoted `&` in the project path (e.g. "Projects & Code") as a command
    // separator and breaks the spawn. Direct node invocation needs no shell.
    const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, MOBILE_BUILD: 'true' },
    })
    child.on('exit', (code, signal) => {
      if (code === 0) resolveP()
      else rejectP(new Error(`next build exited with ${signal ?? code}`))
    })
    child.on('error', rejectP)
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[mobile-build] Starting Capacitor static export build')

  // Pre-clean `.next/` and `out/` from any prior build BEFORE we touch
  // anything else. Round 4 smoke test: running `npm run build` (web target,
  // server actions compiled) immediately followed by `npm run mobile:build`
  // (static export) fails on the first try because the web build's `.next/`
  // cache contains compiled server actions that the static exporter refuses.
  // Manual `rm -rf .next` between builds works around it; this automates
  // that. We do NOT clean `node_modules/.cache` — the cold-start cost
  // (~30–60s) isn't worth it and the issue is `.next` only.
  //
  // The journal file `.mobile-build-renames.json` lives at the project root
  // (NOT inside `.next/`), so this cleanup is safe to run before
  // `restorePrevious()` reads the journal.
  await rm(join(ROOT, '.next'), { recursive: true, force: true })
  await rm(join(ROOT, 'out'), { recursive: true, force: true })
  console.log('[mobile-build] Cleaned .next and out from prior builds.')

  // Recover from any previous interrupted run.
  restorePrevious()

  // Warn if the API base URL is missing — the resulting bundle will work, but
  // every /api/* call will 404 at runtime against capacitor://localhost.
  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    console.warn(
      '\n[mobile-build] WARNING: NEXT_PUBLIC_API_BASE_URL is not set.\n' +
        '  The static bundle will be built, but /api/* calls from the\n' +
        '  Capacitor WebView will fail at runtime. Set it to the deployed\n' +
        '  web URL, e.g. https://roamkeep.net\n',
    )
  }

  console.log('[mobile-build] Resolving exclude patterns...')
  const removeFiles = await expandPatterns(MOBILE_REMOVE_PATTERNS)
  console.log(`[mobile-build] ${removeFiles.length} file(s) will be removed for the build:`)
  for (const f of removeFiles) console.log(`  - ${relative(ROOT, f)}`)

  // Resolve stub paths to absolutes and verify they exist before we touch anything.
  const stubs = MOBILE_STUB_REPLACEMENTS.map((s) => ({
    original: join(ROOT, s.original),
    stub: join(ROOT, s.stub),
  }))
  console.log(`[mobile-build] ${stubs.length} server-action file(s) will be stubbed:`)
  for (const s of stubs) {
    console.log(`  - ${relative(ROOT, s.original)} ← ${relative(ROOT, s.stub)}`)
    if (!existsSync(s.stub)) {
      throw new Error(`Stub file missing: ${relative(ROOT, s.stub)}`)
    }
  }

  let journal = []
  try {
    journal = applyMutations(removeFiles, stubs)
    console.log('[mobile-build] Running `next build` with MOBILE_BUILD=true...')
    await runNextBuild()
    console.log('[mobile-build] Build succeeded.')
  } finally {
    if (journal.length > 0) {
      console.log(`[mobile-build] Restoring ${journal.length} file(s)...`)
      restore(journal)
    }
  }

  console.log('[mobile-build] Done. Static bundle is in ./out')
}

// Last-ditch cleanup on SIGINT/SIGTERM. The `finally` in main() handles the
// happy and error paths; this catches Ctrl+C interrupting a long build.
function installSignalHandlers() {
  const handler = (sig) => {
    console.log(`\n[mobile-build] Received ${sig}, attempting cleanup...`)
    const renames = readRenames()
    if (renames.length > 0) restore(renames)
    process.exit(130)
  }
  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)
}

installSignalHandlers()

main().catch((err) => {
  console.error('[mobile-build] FAILED:', err.message)
  process.exit(1)
})
