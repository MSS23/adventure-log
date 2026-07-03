# Public Wrapped Share Page

## What it is

`/wrapped/share?u=<username>&year=<YYYY|all>` — a fully public, anonymously
watchable version of a user's Travel Wrapped: intro screen, animated globe
flight reel, stats summary, and a persistent "Make your own travel Wrapped"
signup CTA. It replaces the previous behavior where a shared Wrapped link
pointed at the sharer's public profile (`/u/<username>`), and the actual
Wrapped experience (`/wrapped`) bounced logged-out visitors off the
`(fullscreen)` layout's `ProtectedRoute` auth wall.

## Files

| File | Role |
|---|---|
| `src/app/(public)/wrapped/share/page.tsx` | The public page (client component, Suspense-wrapped `useSearchParams`) |
| `src/lib/utils/wrapped-share-url.ts` | `buildWrappedShareUrl(username, year)` — canonical share-URL builder |
| `src/app/(fullscreen)/wrapped/page.tsx` | Existing Share button now calls `buildWrappedShareUrl()` (only edit to shared files) |

## How it works

1. **Owner resolution** — the browser (anon-key) Supabase client queries
   `users` by `username` for `id, username, display_name, avatar_url,
   privacy_level`. The `users_public_read` policy (migration 31, tightened in
   migration 35) allows anon SELECT of undeleted user rows; sensitive columns
   (email etc.) are column-REVOKEd and never selected here.
2. **Data** — reuses `useWrappedData(ownerId, year)` unchanged. Its albums
   query runs under RLS, so an anonymous session only sees rows allowed by
   `albums_public_read` (`visibility = 'public'`, migration 33) and the
   nested `photos` join is scoped by `photos_public_album_read`. Draft
   exclusion happens in the hook. No new data path was written.
3. **Experience** — composes the existing `WrappedGlobe` (dynamic import,
   `ssr: false`, `animate=true`) and `FlightReelOverlay`. Owner-only actions
   (Download Card, mode toggle, globe deep links, friends strip) are absent.
   Pin/album taps route to `/albums/<id>/public` — the only album surface an
   anonymous visitor can open.
4. **Privacy states** — `privacy_level === 'private'` renders a
   "`<name>`'s year is private" state (mirrors the passport page's manual
   check); an account with zero *public* geolocated albums for the selected
   year renders the same tasteful private/empty state. Both keep the signup
   CTA. (`privacy_level === 'friends'` is not blocked page-level — RLS
   already restricts anon readers to `visibility='public'` albums, matching
   the public-profile pages' behavior.)

## RLS surface relied on

- `users_public_read` (m31/m35): anon SELECT on undeleted `users` rows.
- `albums_public_read` (m33): anon SELECT where `visibility = 'public'`.
- `photos_public_album_read` (m33): anon SELECT of photos in public albums.
- `growth_events_insert_anon` (m70): anon INSERT of `wrapped_public_view`.

If any of these policies are dropped, the page degrades to the private/empty
state (or silently skips tracking) — it never errors on an auth wall.

## Share URL format

```
https://<web-origin>/wrapped/share?u=<username>&year=<YYYY|all>&ref=<username>
```

Built by `buildWrappedShareUrl(username, year)`:
- origin = `getWebOrigin()` (never `capacitor://localhost`), falling back to
  `https://adventure-log-azure.vercel.app`;
- `ref` appended via `withRef()` so signups from the link auto-follow the
  sharer (`ReferralHandler` → `claim_referral` RPC).

The own-Wrapped Share button (`(fullscreen)/wrapped/page.tsx`,
`handleShare`) is the only call site today and passes the mode currently on
screen (`year` number or `'all'`).

## Analytics

On load the page fires (once per mount, anonymous insert allowed by RLS):

```ts
trackGrowthEvent('wrapped_public_view', { meta: { username, year } })
```

Signup conversions attribute through the existing `?ref=` →
`ReferralHandler` → `claim_referral` pipeline plus the `signup_via_ref`
growth event (see `docs/growth/METRICS.md`).

## Conversion CTAs

- Persistent top-right pill: "Make your own travel Wrapped" →
  `withRef(<origin>/signup, username)` for logged-out visitors; signed-in
  visitors see "Watch your own Wrapped" → `/wrapped` instead.
- Stats-phase footer block repeats the CTA after the emotional peak.
- Every empty/private/error state keeps the CTA.

## Mobile build

The route is a static query-param page under `(public)` — no dynamic
segment, so it matches nothing in `MOBILE_REMOVE_PATTERNS`
(`scripts/mobile-build.mjs`) and ships in the APK bundle automatically. It
imports no server-only code (no `/api` fetches, no server actions, no
`headers()`/`cookies()`); the globe is `ssr:false`-dynamic. No
`native-routes.ts` mapping is needed for query-param pages. Note album taps
go to `/albums/<id>/public`, which is web-only — `NativeNavigationAdapter`
opens it in the system browser on native, which is the intended behavior for
a share surface.

## SEO / OG

A `'use client'` page cannot export `generateMetadata`, so the page sets
`document.title` client-side (`"<name>'s <year> Travel Wrapped · Adventure
Log"`).

## Follow-ups

- **OG image**: add server-side OG tags for link unfurls. Options: a thin
  server-component wrapper on the web origin that exports `generateMetadata`
  (would need a `MOBILE_BUILD` guard or a client twin, like the passport
  pattern in reverse), or point crawlers at `/api/travel-card?userId=…&year=…`
  via a redirect/edge rewrite. Until then, shares unfurl with the site-wide
  default OG image.
- **Year picker**: the page renders whatever `year` the link carries; a small
  on-page year switcher (rewriting the query param) would let visitors browse
  other years without a new link. `useWrappedData` already fetches all albums
  once, so switching is free.
- **`wrapped_share_visit` vs `share_link_visit`**: if wrapped-link visits
  should be distinguishable from album/profile share visits in funnels, emit
  `share_link_visit` with `meta.surface = 'wrapped'` here too (currently only
  `wrapped_public_view` fires).
