# Time-to-First-Pin Onboarding

Goal: a brand-new user sees **their own globe with pins in under two minutes**.
The wow moment is the pinned globe; everything in this funnel is about
shortening the path from "account exists" to "globe has a pin".

## The funnel

```
signup ──▶ land on /feed (FirstRunGuide) ──▶ /albums/import
       ──▶ pick photos ──▶ EXIF GPS + dates extracted client-side
       ──▶ auto-grouped into albums (lat/lng/country_code/location_name/dates)
       ──▶ one confirm click ──▶ albums created ──▶ first_pin ──▶ "See Your Globe"
```

- **Funnel start (`signup`):** successful `supabase.auth.signUp` on
  `src/app/(auth)/signup/page.tsx`. `markFirstPinStart()` writes
  `localStorage['al_ttfp_start'] = Date.now()` at that moment (no-op if
  already set, so a re-signup on the same device can't reset the clock).
- **Funnel end (`first_pin`):** the first time an import run creates at least
  one album with coordinates, `trackFirstPinIfPending()` fires. If the
  pending key is present it is removed *before* the insert (at-most-once per
  device) and a `first_pin` growth event is emitted with
  `value_ms = now - al_ttfp_start`.

## How time-to-first-pin is measured

- Events land in `public.growth_events` (migration
  `supabase/migrations/70_growth_events.sql`); tracking helpers live in
  `src/lib/utils/growth-events.ts`. See `docs/growth/METRICS.md` for the
  shared contract.
- **TTFP for a user** = `value_ms` on their `first_pin` row. It is measured
  client-side across the whole journey — including the email-confirmation
  round trip, because `al_ttfp_start` persists in localStorage on the signup
  device. A first pin created on a *different* device/browser than the signup
  emits nothing (the pending key isn't there), so TTFP is a same-device
  metric by design.
- **Headline query** (median TTFP, e.g. last 30 days):

  ```sql
  select percentile_cont(0.5) within group (order by value_ms) / 1000.0 as median_ttfp_seconds
  from growth_events
  where event = 'first_pin'
    and created_at > now() - interval '30 days';
  ```

- **Album-creation mix** (import vs manual, geolocated or not):

  ```sql
  select meta->>'via' as via, meta->>'hasGeo' as has_geo, count(*)
  from growth_events
  where event = 'album_created'
  group by 1, 2;
  ```

### Exact instrumentation call sites

| Event / helper | File | When |
|---|---|---|
| `markFirstPinStart()` | `src/app/(auth)/signup/page.tsx` (in `handleSubmit`, right after `signUp` succeeds, before the session/check-email branch) | Email+password signup completion |
| `trackGrowthEvent('album_created', { meta: { via: 'import', hasGeo } })` | `src/components/albums/bulk-import/useBulkImport.ts` (`startUpload`, immediately after each successful `albums` insert) | Every album created by bulk import |
| `trackFirstPinIfPending()` | `src/components/albums/bulk-import/useBulkImport.ts` (`startUpload`, after the upload loop, only if ≥1 created album had coordinates) | First geolocated album from import |

Known gap: Google OAuth signups don't call `markFirstPinStart()` — the OAuth
round trip lands on the shared auth callback, which is also used for login,
and there is no client-side "this was a signup" point today. Manual album
creation (`/albums/new`) is owned by another surface and does not yet emit
`album_created` / `trackFirstPinIfPending()`; until it does, `first_pin`
under-counts users whose first geolocated album was manual (their pending
key stays set and fires on their first import instead). Both are on the
backlog below.

## What changed (this iteration)

1. **Import pipeline hardening** (`src/components/albums/bulk-import/`):
   - Reverse geocoding now captures `address.country_code` from the geocode
     proxy (all three providers — Mapbox, Nominatim, Photon — return it) and
     the album insert writes `country_code` (ISO-2 uppercase). This closes
     the long-standing gap where imported albums had lat/lng but no
     `country_code`, breaking the Countries tab (see CLAUDE.md "Location
     Data Requirements").
   - `country_code` survives group merges in the review step.
   - The 1.1s inter-request geocode delay is skipped after the last group,
     so the common single-trip import doesn't pay a dead wait.
2. **Fewer steps / clearer payoff** (`src/components/albums/BulkPhotoImport.tsx`):
   - The completion screen's primary CTA is now **"See Your Globe"**
     (`/globe`, `localizePath`-safe) — the wow moment — with "View First
     Album" demoted to secondary. Heading becomes "Your globe just lit up"
     when at least one group had coordinates.
3. **First-run funnel** (`src/components/feed/FirstRunGuide.tsx`, shown on
   `/feed` when the account has zero albums):
   - Primary CTA: **"Add your travels — watch your globe light up"** →
     `/albums/import`. Manual creation (`/albums/new`) is the explicit
     secondary link; starter chips still go to manual creation.
   - The guide is now dismissible (X button, persisted in
     `localStorage['al_first_run_guide_dismissed']`); it still auto-retires
     once the first album exists.
4. **Empty-globe CTA** (`src/app/(app)/globe/page.tsx`, inline
   `GlobeEmptyCta` + `GlobeMobileEmptyHint` only):
   - Desktop card: primary "Import Photos" → `/albums/import`, secondary
     "Create Album Manually" → `/albums/new`, same copy direction.
   - Mobile hint: copy aligned ("Add your travels — watch your globe light
     up"); it already pointed at import.
5. **Instrumentation** as per the table above.

## Ideas backlog

- **OAuth signup start point:** detect fresh accounts client-side (mirror
  `ReferralHandler`'s `created_at < 48h` check on `SIGNED_IN`) and call
  `markFirstPinStart()` there, so Google signups enter the funnel.
- **Manual-creation instrumentation:** emit
  `album_created { via: 'manual', hasGeo }` + `trackFirstPinIfPending()`
  from `/albums/new` so the funnel covers both creation paths.
- **Server-side EXIF:** parse GPS/date on the upload gatekeeper instead of
  (or in addition to) the client, so HEIC and stripped-EXIF paths still
  geolocate, and mobile WebView memory pressure drops for big batches.
- **Sample-globe preview pre-signup:** an anonymous landing surface showing a
  seeded, spinning pinned globe ("this could be yours") before the signup
  wall — needs a public, non-`ProtectedRoute` globe surface.
- **HEIC support:** iPhone default format is rejected by the dropzone today
  (jpeg/png/webp only); HEIC decode or server-side conversion would remove
  the biggest real-world import blocker.
- **Skip-review fast path:** when every group geocodes cleanly, offer
  "Looks right — create N albums" as a one-tap confirm above the fold of the
  review list.
- **Parallel/faster reverse geocoding:** the per-group 1.1s spacing protects
  Nominatim, but Mapbox (the primary) tolerates burst traffic; the proxy
  could hint which provider served the request so the client can drop the
  delay.
