# Growth Metrics

How Adventure Log measures growth, and the SQL to compute it.

> **Prerequisite:** apply `supabase/migrations/70_growth_events.sql` in the
> Supabase SQL editor (or via `supabase db push`) before expecting any data.
> Until the table exists, `trackGrowthEvent()` fails silently by design —
> events are simply dropped, never surfaced to the user.

## The table

`public.growth_events` — an append-only, write-only-from-the-client event log.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `created_at` | timestamptz | defaults to `now()` |
| `user_id` | uuid, nullable | FK to `public.users`, `ON DELETE SET NULL`; null for anonymous events |
| `event` | text | one of the events below (CHECK-constrained) |
| `value_ms` | integer, nullable | duration payload (e.g. time-to-first-pin) |
| `meta` | jsonb | free-form context, defaults `{}` |

RLS: `authenticated` can INSERT as themselves (or ownerless); `anon` can
INSERT only `share_link_visit` / `wrapped_public_view` with `user_id IS NULL`.
**Nobody can SELECT through the API** — analysis queries run with the
service-role key (SQL editor or a service-role script), which bypasses RLS.

## Events

| Event | Fired when | Actor | `value_ms` | Typical `meta` |
|---|---|---|---|---|
| `signup` | account created | authenticated | — | `{ method: 'email' \| 'google' }` |
| `signup_via_ref` | account created with a captured `?ref=` (alongside `claim_referral`) | authenticated | — | `{ ref: '<username>' }` |
| `first_pin` | user's first geolocated album exists (`trackFirstPinIfPending()`) | authenticated | ms since `markFirstPinStart()` | — |
| `album_created` | any album created | authenticated | — | `{ source: 'manual' \| 'bulk-import' }` |
| `video_export` | flight-reel / video export completes | authenticated | — | `{ year }` |
| `card_export` | travel-card PNG download completes | authenticated | — | `{ year }` |
| `share_link_created` | user copies / shares a link (any share surface) | authenticated | — | `{ surface: 'wrapped' \| 'album' \| 'passport' \| ... }` |
| `share_link_visit` | a page is loaded with `?ref=` present | anonymous or authenticated | — | `{ ref: '<username>', path }` |
| `wrapped_public_view` | a public wrapped page is viewed | anonymous or authenticated | — | `{ u: '<username>' }` |

Emission helper: `trackGrowthEvent()` in `src/lib/utils/growth-events.ts`.
It is fire-and-forget — never `await` it, never gate UX on it.

## North-star metrics

### 1. Time-to-first-pin (activation)

Median time from signup to the first geolocated album, per weekly signup
cohort. Lower is better; this is the "aha moment" latency.

```sql
-- Weekly median (and p75) time-to-first-pin, from first_pin durations
SELECT
  date_trunc('week', created_at)::date            AS week,
  count(*)                                        AS activated_users,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY value_ms) / 1000.0  AS median_ttfp_seconds,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY value_ms) / 1000.0 AS p75_ttfp_seconds
FROM growth_events
WHERE event = 'first_pin'
  AND value_ms IS NOT NULL
GROUP BY 1
ORDER BY 1;
```

Activation *rate* (share of a signup cohort that ever pins):

```sql
WITH signups AS (
  SELECT user_id, date_trunc('week', min(created_at))::date AS cohort_week
  FROM growth_events
  WHERE event = 'signup' AND user_id IS NOT NULL
  GROUP BY user_id
),
pinned AS (
  SELECT DISTINCT user_id FROM growth_events
  WHERE event = 'first_pin' AND user_id IS NOT NULL
)
SELECT
  s.cohort_week,
  count(*)                                   AS signups,
  count(p.user_id)                           AS activated,
  round(100.0 * count(p.user_id) / count(*), 1) AS activation_pct
FROM signups s
LEFT JOIN pinned p USING (user_id)
GROUP BY 1
ORDER BY 1;
```

### 2. Exports per active user (engagement / shareable output)

How much shareable artifact production (travel cards + videos) happens per
user who did anything that week.

```sql
WITH weekly AS (
  SELECT
    date_trunc('week', created_at)::date AS week,
    count(*) FILTER (WHERE event IN ('card_export', 'video_export')) AS exports,
    count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)       AS active_users
  FROM growth_events
  GROUP BY 1
)
SELECT
  week,
  exports,
  active_users,
  round(exports::numeric / NULLIF(active_users, 0), 2) AS exports_per_active_user
FROM weekly
ORDER BY week;
```

(Note: "active" here means "emitted any growth event that week" — a
lower-bound proxy until a broader activity event exists.)

### 3. Signups per share (viral efficiency)

For each week's share-link creations, how many referred signups landed.

```sql
WITH weekly AS (
  SELECT
    date_trunc('week', created_at)::date AS week,
    count(*) FILTER (WHERE event = 'share_link_created') AS shares,
    count(*) FILTER (WHERE event = 'share_link_visit')   AS visits,
    count(*) FILTER (WHERE event = 'signup_via_ref')     AS ref_signups
  FROM growth_events
  GROUP BY 1
)
SELECT
  week,
  shares,
  visits,
  ref_signups,
  round(ref_signups::numeric / NULLIF(shares, 0), 3) AS signups_per_share,
  round(ref_signups::numeric / NULLIF(visits, 0), 3) AS visit_to_signup_rate
FROM weekly
ORDER BY week;
```

Caveat: shares and their resulting signups can fall in different weeks, so
this is a rate approximation, not a strict cohort attribution. For per-referrer
attribution, join `meta->>'ref'` on `signup_via_ref` rows against usernames.

## Operational notes

- **Apply the migration first.** The client helper deliberately swallows all
  insert errors, so a missing table produces no warnings anywhere — just
  missing data.
- The `(event, created_at)` index covers all queries above.
- `growth_events` is unsampled and grows forever; if volume ever matters,
  archive rows older than ~13 months with a service-role job.
- Anonymous events (`share_link_visit`, `wrapped_public_view`) are insertable
  by the `anon` role and therefore spoofable in principle — treat them as
  directional, not billing-grade.
