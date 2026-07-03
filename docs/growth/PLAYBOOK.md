# Growth Playbook

Master doc for Adventure Log growth. Solo dev, pre-launch, zero budget. Everything here is executable by one person. Written 2026-07-03.

Related docs in this folder:

| Doc | What it covers |
|---|---|
| [PLAY_STORE.md](PLAY_STORE.md) | Getting the Android app onto Google Play (signing, testing tracks, rollout) |
| [DOMAIN_AND_EMAIL.md](DOMAIN_AND_EMAIL.md) | Custom domain, env/APK updates, Supabase redirects, Resend email |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Product Hunt launch + December Travel-Wrapped season |
| [OUTREACH_TEMPLATES.md](OUTREACH_TEMPLATES.md) | Creator DMs, study-abroad emails, Reddit posts, follow-up cadence |
| [ASO.md](ASO.md) | Play Store listing copy, keywords, screenshots, experiments |
| METRICS.md | North-star metric definitions and instrumentation (other track) |
| ONBOARDING.md | Signup -> first pin flow (other track) |
| REFERRAL_LOOP.md | ?ref= mechanics, auto-follow, attribution (other track) |
| FLYOVER_EXPORT.md | Globe flyover video export (other track) |
| PUBLIC_WRAPPED.md | Public/shareable Wrapped pages (other track) |

## Thesis

We cannot outspend anyone and we cannot out-content anyone. The product itself must do the marketing. Adventure Log's unfair advantage is that it produces **artifacts people want to show off**: a 3D globe of everywhere they've been, a flyover video of their trips, a year-in-review Wrapped, and travel cards. Every one of those artifacts carries a `?ref=<username>` link (see `withRef()` in `src/lib/utils/native-routes.ts`; signup via a ref link auto-follows the sharer through the `claim_referral` RPC).

So the growth loop is:

```
            +--------------------------------------------------+
            |                                                  |
            v                                                  |
   [User logs a trip]                                          |
            |                                                  |
            v                                                  |
   [Artifact generated]                                        |
    - 3D globe / flyover video (FLYOVER_EXPORT.md)             |
    - Wrapped year-in-review (PUBLIC_WRAPPED.md)               |
    - travel card / public album page                          |
            |                                                  |
            v                                                  |
   [User exports & posts it]                                   |
    TikTok / IG / group chats -- video or link with ?ref=      |
            |                                                  |
            v                                                  |
   [Viewer taps through]                                       |
    lands on public artifact page with signup CTA              |
            |                                                  |
            v                                                  |
   [Viewer signs up] --auto-follows sharer (REFERRAL_LOOP.md)--+
```

Every sprint below either tightens a step of this loop or pours the right people into the top of it. Nothing else qualifies as growth work.

## Beachhead niches

1. **Study-abroad / gap-year students.** They travel to 8-15 places in a compressed window, they document compulsively, and they arrive in cohorts (orientation in late Aug/Sep, program end in Dec/May — both are "show off my map" moments). Reached via program coordinators, university clubs, and exchange-student group chats.
2. **Travel TikTok micro-creators (5k-50k followers).** Big enough to move installs, small enough to answer DMs. The pitch is a personalized artifact, not a sponsorship — see the "we built your globe" workflow in [OUTREACH_TEMPLATES.md](OUTREACH_TEMPLATES.md).

## Launch moments

- **Product Hunt** — one shot, taken only when the flyover export is the demo (Sprint 6 target, see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)).
- **December "Travel Wrapped" season** — Spotify Wrapped primes everyone to post year-in-review content in early December. Ship-by dates in November; plan in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## North-star metrics

Definitions and instrumentation live in METRICS.md. The three numbers that matter:

1. **Time-to-first-pin** — signup to first album with coordinates on the globe. (Activation. See ONBOARDING.md.)
2. **Exports per active user** — flyover videos + Wrapped shares + travel cards downloaded, per weekly active. (Loop step 2-3.)
3. **Signups per share** — new accounts attributed to `?ref=` links divided by shares created. (Loop step 4-5. See REFERRAL_LOOP.md.)

Do not track vanity numbers (total registered users, page views) as decision inputs.

## 90-day plan (2-week sprints, starting Mon 2026-07-06)

Each sprint has a build track (product work that serves the loop) and an ops track (founder-time distribution work). If a sprint slips, cut ops before build — the loop must exist before pouring people in.

### Sprint 1 — Jul 6-19: Measure and unblock
- [ ] Instrument the three north-star metrics (METRICS.md)
- [ ] Onboarding pass: get time-to-first-pin down; test the full signup -> first pin path on web + APK (ONBOARDING.md)
- [ ] Buy domain, wire Vercel/Supabase/Resend, rebuild APK ([DOMAIN_AND_EMAIL.md](DOMAIN_AND_EMAIL.md)) — do this before Play submission so the listing never shows a vercel.app URL
- [ ] Create Play Console account + release keystore; upload first .aab to closed testing to start the 14-day tester clock ([PLAY_STORE.md](PLAY_STORE.md))
- [ ] Recruit 15-20 real-Google-account testers (friends/family/classmates) for the Play closed test

### Sprint 2 — Jul 20-Aug 2: Build the loop's missing pieces
- [ ] Flyover video export shipped (FLYOVER_EXPORT.md) — this is the hero artifact; nothing else matters more
- [ ] Public Wrapped pages live with signup CTA + ?ref= (PUBLIC_WRAPPED.md)
- [ ] Verify ?ref= attribution end-to-end and that every share surface uses `withRef()` (REFERRAL_LOOP.md)
- [ ] Play closed test running; collect crash/ANR data (Android Vitals affect ranking later)

### Sprint 3 — Aug 3-16: Creator wave 1
- [ ] Build target list: 30 travel TikTok creators, 5k-50k followers, recent posting
- [ ] Run the "we built your globe" workflow for 10 of them; send DMs ([OUTREACH_TEMPLATES.md](OUTREACH_TEMPLATES.md))
- [ ] Build study-abroad target list: 30 program coordinators / university travel clubs (fall orientation is late Aug — emails must land before then)
- [ ] Play: promote closed -> production once the 14-day requirement clears and vitals are clean

### Sprint 4 — Aug 17-30: Student season
- [ ] Send study-abroad emails (orientation timing); offer a 10-minute "map your cohort" demo
- [ ] Reddit builder-story posts (r/solotravel first; read each sub's self-promo rules) — draft in [OUTREACH_TEMPLATES.md](OUTREACH_TEMPLATES.md)
- [ ] Play production live with phased rollout; ASO listing per [ASO.md](ASO.md)
- [ ] Follow-up pass on creator wave 1 (cadence in OUTREACH_TEMPLATES.md)

### Sprint 5 — Aug 31-Sep 13: Tune the funnel with real data
- [ ] Read the three metrics; fix the worst step of the loop (usually export friction or the public-page signup CTA)
- [ ] Creator wave 2 (next 10), incorporating whatever wave 1 taught you about the DM
- [ ] Start Play Store listing experiment #1 (icon or first screenshot — [ASO.md](ASO.md))

### Sprint 6 — Sep 14-27: Product Hunt
- [ ] Launch prep week + launch day per [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
- [ ] Decision gate (see below)

### Beyond day 90
- **October:** retention work driven by what PH cohort data shows; keep creator waves going at 10/sprint.
- **November:** Wrapped-season build freeze dates ([LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)).
- **December:** Travel Wrapped season — the biggest moment of the year for this product.

## Decision gate (end of Sprint 6)

If, after PH + two creator waves + student season, **signups per share** is ~0 (people export artifacts but nobody who sees them signs up), the loop thesis is wrong — stop distribution work and go talk to 20 users before spending another sprint. If shares themselves are ~0, the artifact isn't good enough yet — that's build work, not ops work.

## Do-NOT-do list

- **No paid ads pre-PMF.** No Meta, no TikTok Spark, no Google App campaigns. Paid traffic against an unproven loop burns money and teaches nothing.
- **No new product surfaces.** The app is capped at ~5 bottom-nav tabs by prior decision. Growth features must live inside existing surfaces (globe, Wrapped, albums, feed). Merge, don't add.
- **No web SEO content program.** No blog, no "best travel apps 2026" posts, no programmatic destination pages. SEO compounds on a 12-month horizon; we need signal in 90 days.
- **No iOS work** until Play + web validate the loop. One store is enough to learn from.
- **No paid growth tooling.** Free tiers of everything. No ASO tool subscriptions, no influencer platforms, no email-sending SaaS beyond Resend's free tier.
- **No press/PR agencies, no paid hunters, no upvote services.** These get launches flagged and buy nothing durable.
- **No feature work requested by creators as a condition of posting.** Thank them, log it, move on.

## Weekly operating rhythm

- **Monday:** read the three metrics for last week. Pick the one lever for the week.
- **Tue-Thu:** build track.
- **Friday:** ops track — outreach sends, follow-ups, community replies. Batch it; do not let DMs interrupt build days.
