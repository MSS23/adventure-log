# Referral Loop

How a shared artifact turns into a new, retained, connected user — and how to
measure it.

## The loop, end to end

```
 owner shares an artifact          visitor opens link            visitor signs up
┌─────────────────────────┐      ┌────────────────────┐      ┌──────────────────────┐
│ album / profile /       │      │ any page load:     │      │ ReferralHandler sees │
│ passport / trip /       │ ───▶ │ ReferralHandler    │ ───▶ │ fresh session, calls │
│ wrapped / invite / brag │      │ stores ?ref= in    │      │ claim_referral RPC   │
│ URL carries ?ref=<user> │      │ localStorage       │      │ (mutual follow +     │
└─────────────────────────┘      │ ('al-referrer')    │      │ referred_by stamp)   │
                                 └────────────────────┘      └──────────┬───────────┘
                                                                        │
                          ┌─────────────────────────┐      ┌────────────▼───────────┐
                          │ referrer's profile      │      │ warm landing: redirect │
                          │ shows "N friends joined │ ◀─── │ ONCE to /globe?user=   │
                          │ from your shares"       │      │ <referrerId> — first   │
                          │ (count_referrals RPC)   │      │ screen is the friend's │
                          └─────────────────────────┘      │ pinned globe           │
                                                           └────────────────────────┘
```

1. **Artifact → `?ref=`.** Every user-facing share URL is built as
   `withRef(getWebOrigin() + path, username)` (`src/lib/utils/native-routes.ts`).
   Coverage (all fire `share_link_created` with a `meta.surface`):

   | Surface | `meta.surface` | File |
   |---|---|---|
   | Feed post share | `feed_post` | `src/components/feed/FeedPost.tsx` |
   | Album detail "share" prompt | `album_share_prompt` | `src/components/albums/AlbumDetailView.tsx` |
   | Generic album ShareButton | `album_share_button` | `src/components/albums/ShareButton.tsx` |
   | Public album social bar (copy / intents / native) | `album_social_share` | `src/components/albums/AlbumSocialShare.tsx` |
   | Public passport share/copy | `public_passport` | `src/components/passport/PublicPassportContent.tsx` |
   | Own passport QR + share/copy | `passport_qr` | `src/app/(app)/passport/page.tsx` |
   | Public profile share/copy | `public_profile` | `src/components/profile/PublicProfileContent.tsx` |
   | Own profile hero share | `profile_hero` | `src/components/profile/ProfileHero.tsx` |
   | Invite friends dialog (copy / email / SMS / native) | `invite_dialog` | `src/components/share/InviteFriendsDialog.tsx` |
   | Trip share link | `trip_share` | `src/components/trips/TripDetailView.tsx` |
   | Achievement brag share | `achievement_share` | `src/components/achievements/AchievementUnlock.tsx` |
   | Wrapped share | (owned by the Wrapped track) | `src/app/(fullscreen)/wrapped/page.tsx` — already carries `?ref=` |

2. **Capture.** `ReferralHandler` (`src/components/referral/ReferralHandler.tsx`,
   mounted once in the root layout) validates `?ref=` against
   `/^[a-zA-Z0-9_]{3,30}$/` and stores it in `localStorage['al-referrer']`.
   localStorage (not state) so it survives the email-confirmation round trip.

3. **Signup → claim.** On the first session with a fresh account (< 48 h,
   mirrors the server guard), the handler calls `claim_referral(username)`
   (SECURITY DEFINER, migrations 68 + 71). It:
   - inserts **mutual accepted follows** (claimer ⇄ referrer), idempotently;
   - stamps `users.referred_by = referrer` (first-touch, never overwritten).
   The stored ref is removed before the RPC — one attempt ever, success or not.

4. **Warm landing.** On a successful claim the new user is redirected **once**
   to `/globe?user=<referrerId>` — their first screen is their friend's pinned
   globe, not an empty feed. One-shot via `localStorage['al-warm-landing-done']`.

5. **Status rewards.**
   - **Founding Explorer** badge (`src/components/profile/FoundingExplorerBadge.tsx`):
     amber chip on the own-profile hero and the public profile header for
     accounts with `created_at < FOUNDING_CUTOFF` (`2026-12-31`). Pure
     client-side computation from the profile row.
   - **Friends-joined counter**: own profile shows
     "N friends joined from your shares" via the `count_referrals(_user_id)`
     RPC (returns only the caller's own count).

## Migrations that must be applied

| Migration | What it provides | Required for |
|---|---|---|
| `68_referral_auto_follow.sql` | `claim_referral` (mutual follow) | auto-follow |
| `70_growth_events.sql` | `growth_events` table | all analytics below |
| **`71_referral_attribution.sql`** (new) | `users.referred_by` column, updated `claim_referral` (stamps attribution), `count_referrals` RPC | friends-joined counter, durable attribution |

Everything degrades gracefully if a migration is missing: claims log a
warning, the counter stays hidden, tracking inserts are swallowed.

## Analytics events (see docs/growth/METRICS.md)

- `share_link_created` — fired at the share **action** (copy click, native
  share, social intent click), never on render. `meta.surface` says where.
- `signup` — fired once per device when a fresh (< 48 h) account's session is
  first seen (`localStorage['al-signup-tracked']` one-shot). Covers the SPA
  redirect, email-confirmation and OAuth paths.
- `signup_via_ref` — fired **in addition to** `signup` when `claim_referral`
  succeeds; `meta.ref` is the referrer's username.

## K-factor measurement (service-role SQL against growth_events)

K = invites sent per user x conversion rate of invites. With our events:

```sql
-- Weekly referral funnel: shares -> ref signups, plus K estimate.
WITH weekly AS (
  SELECT
    date_trunc('week', created_at) AS week,
    count(*) FILTER (WHERE event = 'share_link_created')          AS shares,
    count(DISTINCT user_id) FILTER (WHERE event = 'share_link_created') AS sharers,
    count(*) FILTER (WHERE event = 'signup')                      AS signups,
    count(*) FILTER (WHERE event = 'signup_via_ref')              AS ref_signups
  FROM growth_events
  GROUP BY 1
)
SELECT
  week,
  shares,
  sharers,
  signups,
  ref_signups,
  round(ref_signups::numeric / NULLIF(shares, 0), 4)   AS conv_per_share,
  round(shares::numeric / NULLIF(sharers, 0), 2)       AS shares_per_sharer,
  -- K = shares per active sharer x signup conversion per share
  round(
    (shares::numeric / NULLIF(sharers, 0)) *
    (ref_signups::numeric / NULLIF(shares, 0)),
  4)                                                    AS k_factor,
  round(ref_signups::numeric / NULLIF(signups, 0), 4)  AS pct_signups_via_ref
FROM weekly
ORDER BY week DESC;
```

```sql
-- Which surfaces drive shares (and which convert — join on meta->>'ref').
SELECT meta->>'surface' AS surface, count(*) AS shares
FROM growth_events
WHERE event = 'share_link_created'
GROUP BY 1
ORDER BY 2 DESC;
```

```sql
-- Ground truth (independent of client events): attributed signups per referrer.
SELECT r.username, count(*) AS referred_users
FROM users u
JOIN users r ON r.id = u.referred_by
GROUP BY 1
ORDER BY 2 DESC;
```

A sustainable loop needs K > 0.15–0.2 as a meaningful amplifier
(K > 1 = viral, unrealistic pre-market). Watch `conv_per_share` first: if it
is near zero the landing surfaces are leaking, not the share volume.
