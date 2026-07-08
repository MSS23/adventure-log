# Adventure Log — Production-Readiness Brief

> Written 2026-07-08 for a follow-up hardening pass (audience: Claude Opus 4.8
> working in this repo). The app is LIVE at https://adventure-log-azure.vercel.app
> and being showcased publicly. This file ranks what remains, with file
> references, so the next session can execute without re-discovering context.
> Companion docs: `TODO.md` (verified reality list, mostly done),
> `ACTION_PLAN.md` (14-day sprint plan), `CLAUDE.md` (authoritative repo guide).
>
> **Ground rules for the next agent:** CLAUDE.md is accurate and recently
> synced — trust it. Verify every claim below against the code before acting;
> the repo moves fast. Deploy gotcha: pushes to `master` build a PREVIEW —
> production needs `npx vercel promote <url> --yes` (CLI is authenticated)
> until the Vercel "Production Branch" setting is fixed.

## Current state (what's already done — do NOT redo)

- Cold-start hardening on all primary surfaces (feed, globe timeline, album
  detail, profile, comments) via `src/lib/utils/query-retry.ts` + per-query
  React Query retry. Keep-warm GitHub Actions ping every 10 min
  (`.github/workflows/keep-warm.yml`).
- Friend-globe perf: `useTravelTimeline.fetchYearData` now shares ONE
  base-dataset fetch across per-year calls (promise cached in
  `baseAlbumsRef`), friendship check cached, photo-count query removed.
- Google OAuth avatar captured at signup (migration 79) + backfill done;
  `*.googleusercontent.com` allowed for next/image.
- Feed auto-switches brand-new accounts (0 follows, 0 albums) to Discover.
- Middleware downgrades expired-refresh-token console noise to warn.
- Migrations 78 (drop dead `photos.display_order`) and 79 written.
- PII lockdown (m76), RLS initplan perf (m74), photo ordering on
  `order_index` (6beaf2c), account consolidation (one owner account:
  MANRAJ_mob). Demo travelers have journey links + public home bases so
  showcased globes render the arc "spider web".
- CI (lint, type-check, jest, e2e smoke, build), CodeQL, TruffleHog, npm
  audit, Lighthouse CI all exist in `.github/workflows/`.

## P0 — do these before/during any real user traffic

1. **Image size variants** — the single biggest performance item in the repo.
   Every surface loads the full-res original: `getPhotoUrl()`
   (`src/lib/utils/photo-url.ts`) always returns
   `storage/v1/object/public/...`, and there is no thumbnail pipeline.
   Plan (from ACTION_PLAN.md): add `getPhotoUrl(path, { width, quality })` →
   Supabase render API (`storage/v1/render/image/public/...`) — requires a
   Supabase plan with image transforms — or client-side generation of a
   `-thumb` variant at upload in `prepareImageForUpload()`
   (`src/lib/utils/prepare-upload.ts`). Adopt by surface: globe pins 96px,
   avatars 128px, feed 640px, album detail 1280px, lightbox original.
   Feed currently ships multi-MB pages; this fixes web LCP, mobile lag, and
   globe jank at once.

2. **Supabase cold starts — the real cure.** The keep-warm ping mitigates,
   but a free-tier instance under real audience load will still hiccup
   (observed live: PGRST002, 57014, network-level failures). Decide: Supabase
   Pro (no pausing, image transforms included — pairs with P0#1) as soon as
   there is any real usage.

3. **Rate limiting is fail-open until Upstash env vars are set** (owner
   action, dashboard-only): `UPSTASH_REDIS_REST_URL`/`_TOKEN` in Vercel.
   52 error-log hits in 3 days. After it's set, consider making the
   validator hard-fail in prod (`src/lib/utils/environment-validator.ts`
   currently only logs an error).

4. **Apply migrations 78 + 79 in prod** (owner action: Supabase SQL editor
   or `supabase db push`). 79 matters for every new Google signup.

5. **Vercel Git production branch** (owner action): Settings → Git →
   Production Branch = `master`, so pushes stop needing manual promotes.

## P1 — high-visibility polish for a public audience

6. **Retry hardening for secondary components.** During a live cold start
   these still error while the pages ride through: `useLikes`
   (`src/lib/hooks/useSocial.ts`), `useFollows.getFollowStatus`,
   `AchievementProvider`. Same fix as everywhere else: wrap in
   `runQueryWithRetry` from `src/lib/utils/query-retry.ts`.

7. **Own-profile page has no globe.** `/profile` (`src/app/(app)/profile/ProfileContent.tsx`)
   shows only stats — the Footprint globe exists only on OTHER people's
   profiles (`UserProfileView`) and public `/u/[username]`
   (`PublicProfileContent`). The owner's first instinct is to show their own
   profile — embed the same `ProfileGlobe` there (data is already at hand:
   own albums).

8. **"Continues from" discoverability.** Travel lines only draw from
   `albums.connected_from_album_id` (m75) or an opted-in public home
   (m77). Real users will never find the "Continues from" dropdown in the
   album edit form. Prompt for it in the create flow when the new album's
   dates directly follow an existing trip; consider a home-location prompt in
   onboarding (privacy-defaulted OFF).

9. **Stripe webhook** (revenue loop, ACTION_PLAN Day 4–5). Pro gates exist
   but entitlement is a manual DB flag. `/api/stripe/webhook`:
   `checkout.session.completed` → `users.plan='pro'`;
   `customer.subscription.deleted` → downgrade; swap the static payment link
   (`NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) for a checkout session carrying
   `client_reference_id`.

10. **Verify the growth loop instrumentation fires**: growth_events (m70)
    for signup / first album / first share / referral click, and the m71
    referral attribution. "You cannot iterate on a funnel you can't see."

## P2 — robustness and code health

11. **Lint warnings** (CI tolerates them; still fix): unused `useMemo` in
    `src/components/blend/BlendContent.tsx:3`; unused `setActiveCityId`,
    `isAutoRotating`, `userInteracting` in
    `src/components/globe/EnhancedGlobe.tsx:142-145`.

12. **E2E coverage of the proven flows.** The full album flow
    (login → quick-post 3 photos → order_index 0,1,2 → lightbox → delete →
    profile globe) and the globe surfaces are scriptable (see TODO.md #13).
    Add `e2e/album-flow.spec.ts` + `e2e/profile-globe.spec.ts` with a
    service-role seeded user; include in the CI smoke grep (currently only
    "Landing Page|Manifest endpoint|page renders").

13. **Schema-vs-code column check in CI** (TODO.md #14) — the
    order_index/display_order split-brain lived for months. Cheapest guard:
    script that extracts `.order(...)`/`.select(...)` column lists in src/
    and checks them against `information_schema.columns`.

14. **Counter columns** for likes/comments (ACTION_PLAN Day 2–3): feed
    fetches every like/comment row per page to count them
    (`src/app/(app)/feed/page.tsx` fetchFeedPage). Migration:
    trigger-maintained `likes_count`/`comments_count` on albums, then read
    the columns.

15. **`useTravelTimeline` full restructure** (the July-8 fix removed the N×
    refetch; the remaining shape is still awkward): fetch once, bucket by
    year client-side, wrap in React Query instead of hand-rolled
    state/refs/retry ticks.

16. **Service worker cache trimming**: add max-entries eviction to
    `public/sw.js` image/dynamic caches so long-lived PWA installs don't
    grow unbounded.

17. **Account deletion → storage objects.** Verify deletion cascades remove
    the user's storage files (photos bucket), not just DB rows (GDPR-ish
    hygiene; ACTION_PLAN Day 5 item, never verified).

18. **Vercel Analytics script 404s inside the Capacitor WebView**
    (`Unable to open asset URL: https://localhost/_vercel/insights/script.js`)
    — gate the analytics component on `!isNativePlatform()`.

## P3 — parked (post-launch, from ACTION_PLAN)

Per-trip recap reel (or static trip-card fallback) → web push notifications
(tables + prefs UI already exist) → welcome/digest emails → Capacitor push +
app-store submissions → AI trip drafts → programmatic SEO on
`/places/[slug]` → structural refactors from `IMPROVEMENTS.md`.

## Showcase-day operational notes

- Watch `get_runtime_errors` (Vercel MCP) daily; new error groups are the
  fastest broken-thing signal.
- The mobile APK (debug) on the owner's Pixel is current as of 2026-07-08;
  rebuild recipe is in TODO.md #4 (gradlew.bat breaks on the `&` in the repo
  path — use Git Bash `./gradlew` + Android Studio JBR).
- Repo is PUBLIC. Never commit TODO.md / ACTION_PLAN.md /
  PRODUCTION_READINESS.md if they contain emails or account IDs (this file
  deliberately contains none... keep it that way).
