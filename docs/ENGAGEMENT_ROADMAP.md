# Adventure Log — Engagement & Virality Roadmap

Synthesis of multiple audits (competitor research, frontend, backend,
architecture, dead-code, globe/upload/auth deep dive) into a single
prioritised roadmap. Each item names the evidence it came from, an effort
estimate, and the user-facing payoff.

**Reading order:** do Tier 0 *before* shipping any Tier 1+ feature. The
Tier 0 issues are real bugs / silent-failure paths that will undermine any
growth investment.

---

## Tier 0 — Stop the bleeding (must do before virality work)

These are real problems. None will make the app viral; all will make growth
investments wasteful or risky if left unfixed.

### 1. Server-side file size cap on photo uploads (CRITICAL — security/cost)
- **Risk:** A single malicious user can fill storage with multi-GB uploads
  if the upload pipeline doesn't enforce a server-side size cap. Even if a
  client validator exists, it can be bypassed.
- **Fix:** Validate `file.size` against `uploadSecurity.maxFileSize` (10MB)
  in the upload action *and* tighten the bucket policy in Supabase.
- **Effort:** 1–2 hours.

### 2. Profile-creation race (HIGH — onboarding correctness)
- **Evidence:** AuthProvider can call `createProfile` while the
  `create_profile_on_signup` DB trigger also creates a row. Both can race,
  producing duplicate-key errors or wrong username on first login.
- **Fix:** `upsert(..., { ignoreDuplicates: true })` so concurrent creates
  silently no-op; in-flight Map to dedupe concurrent `fetchProfile` calls per
  userId. (Both included in this PR.)
- **Effort:** done.

### 3. Globe `innerHTML` (HIGH — security pattern)
- **Evidence:** `EnhancedGlobe` uses `el.innerHTML = …` with template strings
  for pin and tooltip rendering. All user-supplied interpolations go through
  `escapeHtml`/`escapeAttr` today, but the pattern itself is fragile and the
  next maintainer to add a field could miss the escape.
- **Fix:** Replace with `createElement` + `textContent` for text nodes and
  `appendChild` for structural nodes. Also gate URL-typed values through
  `safeImageUrl` (added in this PR) to strip `javascript:`/`vbscript:` schemes.
- **Effort:** 3–4 hours of careful refactor across the three sites.

### 4. Globe animation-frame leak (HIGH — memory)
- **Evidence:** `requestAnimationFrame` loops in the globe (camera animation,
  auto-rotate) survive component unmount in some paths, accessing now-null
  refs and leaking memory.
- **Fix:** Add `disposedRef.current` guard at top of each `animate()` so
  queued frames bail; capture rAF id at scheduling time so cleanup can
  always cancel.
- **Effort:** 1 hour.

### 5. Storage bucket existence check (HIGH — silent failure)
- **Evidence:** `checkBucketExists` was hardcoded `return true` — meant if
  the production bucket was ever misconfigured/deleted, every upload would
  fail with cryptic Supabase errors instead of a clear early signal.
- **Fix:** Real `listBuckets()` check, in-process cached, graceful on
  401/403. (Included in this PR.)
- **Effort:** done.

### 6. Schema sprawl (MEDIUM — repo hygiene)
- **Evidence:** Two parallel migration trees historically existed and
  multiple `fix-*.sql` files sat at repo root. Whatever ran in prod is hard
  to reconstruct from the repo.
- **Fix:** Pick one tree as canonical, archive the other under
  `archive/database-old/`, document which migrations were applied.
- **Effort:** 1–2 hours.

### 7. Apply pending RLS / RPC migration
- **Evidence:** Until this is run, follows table returns 406 errors and the
  "creators to follow" RPC returns 404 in the UI.
- **Fix:** Run the relevant migration in Supabase SQL Editor.
- **Effort:** 5 minutes (you only).

### 8. Replace remaining `console.*` in API routes with structured logger
- **Evidence:** `console.error/log` calls in API routes bypass structured
  logging and don't reach Sentry in production.
- **Fix:** Search-and-replace with `log.error`/`log.info` carrying
  `component`/`action` context tags.
- **Effort:** 1 hour.

---

## Tier 1 — Quick visible wins (1–3 days each)

These are the highest-ROI additions. Each maps to a competitor's proven
hook, lifts engagement measurably, and ships in a single short sprint.

### 1.1 Year-in-review / "Wrapped" — **the #1 viral mechanic**
- **Source:** Polarsteps Year Recap, Strava Year-in-Sport, Spotify Wrapped — every
  travel/fitness/culture app that went viral has this.
- A `/wrapped` route already exists — finish it. The unfair-advantage version
  is a shareable card with countries / albums / miles / "longest trip" /
  "favourite city" / a snapshot of the user's globe, released early December.
- **Why viral:** users post these screenshots to Instagram/X. Free
  distribution, free brand exposure, single highest organic-growth lever.
- **Effort:** 2–3 days for a polished v1.

### 1.2 Auto-generated trip recap reel (vertical 9:16 MP4)
- **Source:** Polarsteps Trip Reels, TikTok-native. The biggest "share
  artifact" lever in travel.
- Every album/trip gets a "Play recap" button → generates a 30-60s vertical
  video stitched from album photos with simple Ken Burns + optional location
  captions.
- **Why viral:** the share unit must be a *video*, not a screenshot, in 2026.
  Anything less doesn't move on TikTok/Reels.
- **Effort:** 3 days for a serviceable v1 using `<canvas>` + `MediaRecorder`
  on the client. No server-side encoding needed for v1.

### 1.3 Public globe browsing pre-signup
- **Source:** Airbnb, Tripadvisor, Letterboxd. Drops onboarding friction.
- A logged-out visitor can spin a globe showing public trips from the
  community. Sign-up is gated only when they try to *create*, not *browse*.
- **Why:** kills the "trust me, sign up first" friction killing top-of-funnel.
- **Effort:** 1–2 days. Reuses the globe; needs a public API route returning
  anonymised public-album pins.

### 1.4 Sunset push notification
- **Source:** BeReal randomised prompt; CleverTap travel-app data shows this
  drives 90-day retention 2-6×.
- If user marked themselves "currently traveling" (or app detects new GPS
  country), send a push at sunset local time: "Capture today's highlight."
- **Effort:** 1 day. Notification infra exists; this is a new trigger.

### 1.5 Friend taste-match score
- **Source:** Beli's "palette match", Letterboxd's "similar to you".
- "Your travel taste is 87% similar to @sam." Show on profile pages and in
  the friend-suggest feed.
- **Why:** soft social hook; converts shallow follows into real follows.
- **Effort:** 1.5 days. Cosine similarity over country sets / continent
  visit patterns / album-tag overlap.

### 1.6 Empty state polish
- When a new user has zero albums, the dashboard / globe / feed each show
  a hand-drawn-style illustration + a single clear CTA: "Add your first
  place." This is the moment new users churn.
- **Effort:** 1 day total across the surfaces.

**Tier 1 total: ~10–12 days. Pick 2–3 to ship first; do not try to ship all
six in parallel.**

---

## Tier 2 — Retention & sharing loops (3–5 days each)

Schedule after at least one Tier 1 ships.

### 2.1 Wanderlog-style daily itinerary blocks with link-share collab
- Itinerary editor with day-by-day time slots, drag-and-drop activities,
  attachable confirmation numbers, link-based invite.
- An `/itineraries` surface already exists — this is upgrading it.
- **Effort:** 5 days for a feature-parity v1.

### 2.2 Pairwise place ranking (Beli mechanic)
- Instead of star-rating, "Was Tokyo better than Lisbon?" Repeated comparisons
  produce a personal ranked leaderboard.
- **Why:** zero rating inflation, deeply personal output, naturally social.
- **Effort:** 3–4 days. Bucket-list/visited tables exist; this is the
  comparison UI + ranking algorithm (TrueSkill or simple Elo).

### 2.3 Auto GPS path tracking for active trips
- Opt-in background-tracking on Capacitor that draws a path line on the globe
  between album points.
- **Effort:** 4 days. Capacitor Geolocation plugin already in deps.

### 2.4 Country-completion rings (Apple-Watch metaphor)
- For each continent, a ring showing % of countries visited.
- **Effort:** 2 days (data already there).

### 2.5 Place-based comments on the globe
- Every pinned location accrues comments from people who've visited.
  Tap a pin → "Tips from travelers."
- **Effort:** 4 days.

---

## Tier 3 — Differentiation moat (1–2 weeks each)

What makes Adventure Log *not* a Polarsteps clone. No competitor owns the
globe-as-canvas; lean in.

### 3.1 Globe time-scrubber → MP4 export
- Drag a slider through the years; pins and arcs appear as if travel is
  happening in real time. Export as MP4 → goes on TikTok.
- **Effort:** 2 weeks.

### 3.2 Multiplayer globe — friends' travel layered on yours
- Toggle on a friend → their pins appear on your globe in their accent
  color.
- **Effort:** 1.5 weeks.

### 3.3 Email-forward to build itineraries (TripIt's killer feature)
- A unique `plans@adventurelog.app` email per user. Forward your
  hotel/flight confirmation; the AI itinerary planner extracts everything.
- **Effort:** 1.5 weeks (deliverability + parsing reliability).

---

## What NOT to build

From competitor research — these are crowded, low-ROI, or off-strategy:

- **Flight/hotel booking aggregation.** Hopper, Tripadvisor, Trip.com own
  this; razor-thin margins; capital-intensive. Stay logging-first.
- **Price prediction / Price Freeze.** Hopper's moat is years of data.
- **AI trip generation as a *primary* feature / hero pitch.** Wanderlog,
  Polarsteps, Mindtrip already commoditised it. Keep your existing AI
  planner; do not market it as the headline.
- **General "meet other travelers" matching.** TripBFF / Couchsurfing /
  Fairytrail occupy this; high moderation cost, real safety overhead.
- **Restaurant reviews as a destination.** Beli / Google / Yelp own this.
  Borrow the *ranking mechanic* (2.2) but don't compete head-on.

---

## What NOT to refactor

These look fine; refactoring is high-risk:

- The dual-client Supabase pattern with the Capacitor storage adapter
- Middleware routing & CSRF check (only the rate-limiter backend needs
  swapping if you go multi-instance)
- Webpack chunk groups (globe/ui/vendor) — tuned correctly
- Sentry triple-config (client/server/edge)
- AuthProvider's *public API* (its internals can be modernised; the contract
  many components depend on must stay)
- React Query staleTime/gcTime defaults
- Polymorphic `likes`/`comments` table design — multi-migration project,
  not a polish pass

---

## The "what to do this month" recommendation

If forced to pick one month of focused work:

- **Week 1:** Tier 0 (this PR closes 6 of 8 of those items)
- **Week 2–3:** Tier 1.1 (Wrapped) + Tier 1.3 (public globe pre-signup)
- **Week 4:** Tier 1.2 (trip recap reel v1) — the share artifact

After that month: Tier 0 risk is gone, the app has a real viral artifact,
top-of-funnel friction is dramatically lower. *That* is the foundation for
Tier 2/3.
