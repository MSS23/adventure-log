# Adventure Log — Improvement Roadmap

> Full codebase review, 2026-07-04. Five parallel review passes: security, performance,
> architecture/code quality, testing/CI/DX, and product/features. Scope: 553 TS/TSX files,
> ~106.5k LOC under `src/`, 46 API routes, 73 migrations.
>
> **Verified while reviewing:** `npm test` passes (292/292), `tsc --noEmit` clean, ESLint 0 errors /
> 7 warnings. CI (`.github/workflows/`) is real and decent. The codebase is in better shape than
> its own docs claim — the biggest risks are two security holes, a handful of query shapes that
> already caused a production timeout, and documentation that has drifted far from reality.

---

## Scorecard

| Area | Grade | One-liner |
|---|---|---|
| Security | **B–** | Strong middleware/upload/SSRF hygiene, but 2 HIGH findings (PII leak, passport-connect follow bypass) |
| Performance | **B** | Excellent bundle splitting; data-fetching layer has N+1s that already caused a prod incident |
| Architecture | **B–** | Great infra layer (logging, mobile build); app layer grew by copy-paste, 700–1,200-line god components |
| Testing / CI | **C+** | CI real, tests green — but ~4% coverage and the e2e suite is ~90% skipped in CI |
| Docs (CLAUDE.md) | **D** | Documents hooks, routes, and infra that don't exist; actively misleads AI-assisted development |
| Product completeness | **B+** | Feature-dense and polished; three open loops: payments, push, email |

---

## 🔴 DO NOW (this week — security & production correctness)

### 1. Lock down PII on `public.users` — CONFIRMED leak
Any logged-in user can read **every** user's `email` and `date_of_birth` via the REST API;
anon can do the same for all public-profile users.

- `47_account_privacy_visibility.sql:36-40` — `users_authenticated_read` is `USING (true)` for all authenticated users.
- `27_trip_planner_phase2.sql:59` — **table-level** `GRANT SELECT ON public.users TO anon`.
- `35_clerk_function_rewrites.sql:964-991` tries `REVOKE SELECT (email) ...`, but **column-level REVOKEs cannot subtract from a table-level GRANT in Postgres** — they're additive, so the revoke is ineffective.
- Columns added after m35 (`date_of_birth` in m60, `plan` in m69, `referred_by` in m71) have no revoke at all.

**Fix:** Drop the table-level SELECT grants for anon/authenticated on `users`; serve all non-self
reads through the existing `users_public` view (already granted in m36/m38) with sensitive columns
excluded, or grant only the safe columns explicitly. Verify live grants with `\dp public.users`.

### 2. Gate `/api/passport/connect` — privacy bypass
`src/app/api/passport/connect/route.ts:22-108` accepts a bare `{ targetUserId }` and uses the
**service-role** client to create an *accepted mutual follow in both directions*, explicitly ignoring
the target's `privacy_level`. The QR only encodes a public username (`src/lib/utils/qr-decode.ts:92`),
so there's no proof of an in-person scan — any authenticated user can force friends-level RLS access
to a private user's albums, wishlist, and Blend. No rate limit on the route.

**Fix:** Encode a signed, short-expiry nonce in the passport QR and require it in the connect call;
rate-limit the route; for private/friends accounts, create a *pending* follow request instead of
auto-accepting the target's direction.

### 3. Commit and apply migration 74
`supabase/migrations/74_fix_rls_initplan_performance.sql` (currently untracked) rewrites every RLS
policy from bare `auth.uid()` to initplan-wrapped `(select auth.uid())` and adds
`idx_albums_user_created` + `idx_likes_user_target` — matching the exact query shapes behind the
2026-07-03 production 57014 (statement timeout) burst. It was verified semantically identical to
existing policies (nothing weakened). Highest-leverage DB fix in the repo, zero code changes.

### 4. Make rate limiting real in production
`src/lib/utils/rate-limit-redis.ts:41-49` **fails open** when Upstash isn't configured or errors,
and the synchronous `rateLimit()` (`rate-limit.ts:183`) always uses an in-memory per-instance Map —
on Vercel that means the effective limit is N× across N instances, or nothing at all.

**Fix:** Treat `UPSTASH_REDIS_REST_URL/TOKEN` as required in prod (env validator currently only
warns); migrate remaining `rateLimit()` callers to `rateLimitAsync()`.

### 5. Kill the feed like-check N+1
`src/lib/hooks/useSocial.ts:103-113` — every `LikeButton` and `PhotoCarousel` mounts `useLikes`,
which fires an individual `likes?...limit=1` existence query. **~20 queries per feed page of 10
posts** — verbatim one of the failing query shapes in the migration-74 incident log.

**Fix:** In `fetchFeedPage` (`src/app/(app)/feed/page.tsx`), batch one
`likes.select('target_id').eq('user_id', uid).in('target_id', albumIds)` query and pass
`initialLiked` down; have `useLikes` skip `checkIfLiked` when given an initial value.

### 6. Fix the Windows dev-environment landmine
On this machine, **every npm script fails** (`'...\node_modules\.bin\' is not recognized`) because
the project lives under `Projects & Code` — the unescaped `&` breaks npm's cmd shims. Either move
the repo to an ampersand-free path or set npm's `script-shell` to PowerShell/bash.

### 7. Rewrite CLAUDE.md to match reality
The steering doc actively produces wrong code in AI-assisted sessions. It documents:
- **12 hooks with zero call sites** (`useSupabaseQuery`, `usePhotoUpload`, `useReactions`, `useRealTime`, …)
- **API routes that don't exist** (`/api/itineraries*`, `/api/playlists*`, `/api/globe-reactions*`, `/api/trip-planner/generate`)
- Zustand for client state (0 imports), "9 migration files" (73), GROQ for trip AI (only Anthropic is used),
  a stories feature with no UI, `-thumbnail/-medium/-large` image variants that are never generated,
  and CI as "recommended" when it exists.

Regenerate the hooks table, API table, state-management, and migration sections from the actual tree.

---

## 🟠 DO SOON (next 2–4 weeks)

### Performance
- **Restructure `useTravelTimeline`** (`src/lib/hooks/useTravelTimeline.ts:184-294, 521-525`): it
  downloads the user's *entire* album+photo dataset once **per year, in parallel** ("All Years" mode
  = 6 identical full downloads for a 6-year traveler), then filters in JS; a second redundant query
  re-counts photos already in the embed; realtime events clear the whole cache and refetch.
  Fetch once, bucket by year client-side, use `photos(count)` + `.limit(5, { referencedTable: 'photos' })`,
  and put it under React Query so globe/feed/profile share one cache.
- **Counter columns for likes/comments**: `feed/page.tsx:126-148` fetches *every like and comment row*
  for the page's albums to count client-side (5,000 likes = 5,000 rows to render "5k"). Add
  trigger-maintained `likes_count`/`comments_count` on `albums`.
- **Image size variants**: no variants exist despite docs; `getPhotoUrl` always returns originals.
  Globe pins (`createPinElement.ts:358`) and Wrapped inject full-res `<img>`s, and mobile builds set
  `images.unoptimized: true` — the Capacitor app ships every photo at original resolution. Add a
  `getPhotoUrl(path, { width })` using Supabase Storage render transforms and adopt it for pins,
  avatars, and everywhere on native.
- **Service worker cache caps**: `public/sw.js` image/dynamic caches grow unbounded until the next
  deploy purge. Add max-entries trimming.
- **Delete `src/lib/hooks/useFeedData.ts`** — unreferenced dead code with the worst query pattern in
  the repo (select-* of 100 albums + all photos + all likes/comments, client-side privacy filtering).

### Product loops (revenue & retention)
- **Stripe webhook → auto-flip `users.plan`** *(S effort)*: `/pro` is priced and every gate works
  (AI imports, Insights, photo caps), but there's no webhook — entitlement is a manual DB flag flip.
  One `/api/stripe/webhook` route consuming `checkout.session.completed` /
  `customer.subscription.deleted` closes the revenue loop.
- **Audit + wire the email notification pipeline** *(M)*: `api/email/notify` still contains
  reverted-Clerk-era assumptions and nothing calls it on social events.
- **Web push delivery** *(M)*: `push_subscriptions` table exists (m25) but there is zero
  `pushManager` code and no `push` handler in `sw.js`. ~90% of the plumbing (notifications table,
  realtime, per-type prefs UI at `/settings/notifications`) already exists. Biggest retention hole
  in a social app.

### Testing & operations
- Add tests for the two riskiest untested paths: **album server actions**
  (`src/app/(app)/albums/actions.ts` — create/update/delete with visibility) and the
  **photo upload validation path**. Current coverage: 21 test files vs 553 source files (~4%).
- **Migration hygiene**: resolve the duplicate `60_album_favorites.sql` / `60_parental_controls.sql`
  numbering, add `supabase/config.toml` + `supabase link` so `db diff` can detect drift (today there
  is no record of what the live DB actually contains), and archive `migrations_backup/` (49 files)
  out of the migrations tree.
- **Run the real e2e suite**: `__tests__/e2e/critical-path.spec.ts` is a good 490-line suite, but CI
  only greps for "Landing Page|Manifest|page renders" against placeholder creds — auth, feed,
  albums, globe e2e never run anywhere. Add a nightly job against a seeded Supabase branch project.
- **Sentry client init**: migrate deprecated `sentry.client.config.ts` → `instrumentation-client.ts`
  (@sentry/nextjs v10) and verify a client event arrives in prod; gate or remove
  `/sentry-example-page` in production.
- Add `, pg_temp` to `SET search_path` in `claim_referral`/`count_referrals` (m68/m71) to match the
  m59/m73 hardening standard.

### Quick code-quality wins (hours each)
- **Completed (July 2026):** removed the unused direct dependencies and fixed
  `useGlobeState`'s animation-frame ref to use the browser's numeric handle.
- Decide `error-handler.ts`'s fate: 464 lines, exactly one consumer, `withRetry`/`getUserFriendlyMessage`
  have zero call sites while 126 catch blocks and 46 raw `toast.error`s roll their own. Either wire it
  into the toast sites or delete it and codify a ~30-line `log.error → toast(friendly)` helper.
- Delete unreferenced `src/components/gamification/` and `src/components/offline/` (verify first).
- Fix the 7 files building storage URLs by hand (`storage/v1/object/public` literals, e.g.
  `src/lib/albums/delete-photo.ts`) instead of `getPhotoUrl()`.
- **Decide stories: ship or delete.** Tables exist (24h stories per docs), zero UI queries them.
  Deleting the tables + docs is the cheap, defensible call.

---

## 🟡 DO LATER (1–3 months — structural)

1. **One data-fetching pattern.** React Query is configured well but used in only 6 files; 47
   components create raw Supabase clients in `useEffect`, and 70 files query `from('albums')`
   directly with per-page re-implementations of the privacy filter (a security-adjacent risk).
   Build `src/lib/queries/` with per-entity hooks (`useAlbums`, `useAlbum(id)`, `useProfile(userId)`)
   wrapping canonical select strings; migrate incrementally starting with the profile/passport surfaces.
2. **Break up the god components.** `wrapped/page.tsx` (1,207 lines), `AlbumDetailView` (1,041,
   14 useState), `useGlobeState` (1,010-line hook, 14 useState + 12 useEffect + ref workarounds),
   `TripDetailView` (828 lines, **23 useState**), `AlbumEditView` (857). Extract each dialog + its
   state (InvitePanel, SharePanel, SuggestRoutePanel) and move fetch/mutate into hooks. The 32
   `react-hooks/exhaustive-deps` suppressions concentrated in these files are stale-closure bugs waiting.
3. **De-duplicate the public/private twins.** Wrapped (`(fullscreen)/wrapped/page.tsx` vs
   `(public)/wrapped/share/page.tsx` — `StatCard`/`StatPill` defined twice, near-identical), three
   profile implementations, two passport implementations. (Distinct from the deliberate — and good —
   mobile static-twin pattern, which correctly shares one body component.)
4. **Generated DB types.** Replace the hand-maintained 1,053-line `src/types/database.ts` alias
   swamp with `supabase gen types typescript` for row types + a thin documented alias layer on top.
5. **Mobile-build drift CI check.** `scripts/mobile-build.mjs` is defensively engineered, but its
   manual registries (`MOBILE_REMOVE_PATTERNS`, stub list, `native-routes.ts` mappings) drift
   silently. Add a CI step that diffs dynamic routes / `'use server'` files / stub export signatures
   against the registries so drift fails loudly.
6. **Coverage ratchet + RLS tests.** Set a Jest coverage threshold (even 15–20%, ratcheted) and add
   RLS policy tests (pgTAP or a script against a branch DB) — the Clerk-era loss of the trips INSERT
   policy shows RLS is the most fragile, least-observed layer.
7. **CSP nonce migration** — drop `script-src 'unsafe-inline'` in production (`next.config.ts:279`).
8. **Migration squash.** Once the live DB is CLI-linked, squash 02–74 into a fresh timestamped baseline.

---

## ✨ Feature Proposals

### Completions of half-built things
| # | Feature | Why | Effort |
|---|---|---|---|
| 1 | **Stripe webhook → auto Pro entitlement** | Every gate + the `/pro` page exist; this is the last mile to real revenue | S |
| 2 | **Web push notifications** | Table, prefs UI, realtime all exist; closes the retention loop | M |
| 3 | **Email pipeline fix + weekly digest** | "Your Paris album got 5 likes this week" — creator re-engagement | M |
| 4 | **Place-aware search** | `/places/[slug]` feeds + geocode API are built but unreachable from search | S–M |
| 5 | **Server-side onboarding state + funnel events** | FirstRunGuide dismissals are localStorage-only; the growth sprint needs measurable funnel data | S |
| 6 | **Stories: ship a "trip moments" rail or delete the tables** | Dead schema either becomes a growth feature or gets scrubbed | L / S |

### High-leverage new features
| # | Feature | Why | Effort |
|---|---|---|---|
| 7 | **AI trip drafts from wishlist** — "Plan this" orders saved places into day blocks written into the existing trips/pins schema | Connects the two strongest systems (AI link-import wishlist → collaborative trips); obvious second Pro gate | M |
| 8 | **Monthly mini-Wrapped / per-trip recap reel** — reuse the flyover + `useWrappedVideoExport` for a 9:16 recap right after upload | Turns every trip into a share moment instead of once a year; renderer + share URLs + growth events exist | M |
| 9 | **Country-completion rings & region goals** on the passport, with a shareable card | Cheap gamification on data `useTravelPassport` already computes | S |
| 10 | **Friends layer on the 3D globe** — port the 2D `/map` friends layer to `/globe` | The globe is the differentiator; this makes it social | M |
| 11 | **"You've both been to Kyoto" everywhere** — surface the existing privacy-hardened `you-were-here` API in feed cards and profiles, linking to Blend | The app's most distinctive social hook, already built and gated | S |
| 12 | **Pro perk: original-quality ZIP export + GeoJSON/GPX of all pins** | Strengthens the thin Pro bundle at near-zero infra cost | S–M |

---

## What's already done well (don't break these)

- **Middleware default-denies `/api/*`** with an explicit public allowlist; JSON 401s for data
  requests, redirects for navigations; constant-time (`timingSafeEqual`) shared-secret checks.
- **SSRF hardening** in link resolution (host allowlist, private/metadata IP blocking, per-hop
  redirect re-validation).
- **Upload security**: signed URLs, server-built storage paths, ownership checks, MIME allowlist,
  plan-based caps; storage RLS scoped by folder = `auth.uid()`.
- **AI surface is tight**: server-only, per-user rate limits + monthly Pro quota, `max_tokens` capped,
  strict JSON parsing.
- **Bundle engineering**: globe/three/framer-motion/leaflet chunk splitting with transitive-dep
  matchers; all 5 globe mounts dynamically imported `ssr:false`; memoized pin factory.
- **Mobile build system**: journaled renames with crash-safe restore, static twins for every dynamic
  route, bearer-auth `apiFetch` bridge.
- **Structured logging** genuinely adopted (185 files); TODO debt near zero (3 total); only ~6 `any`s
  in 106k lines; CI with CodeQL, TruffleHog, npm audit, Lighthouse.
- **Onboarding** (FirstRunGuide, bulk EXIF import as primary CTA, claim-handle card) is genuinely good.

---

## Suggested execution order

**Week 1:** items 1–7 of DO NOW (the two security fixes first, migration 74 same day).
**Weeks 2–4:** Stripe webhook, feed/timeline query fixes, image variants, migration hygiene, dead-dep purge.
**Month 2+:** data-layer unification, god-component splits, push notifications, e2e in CI, then features 7–12 as product bets.
