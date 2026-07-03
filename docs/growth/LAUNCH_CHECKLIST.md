# Launch checklists

Two launch moments, per the thesis in [PLAYBOOK.md](PLAYBOOK.md): Product Hunt (Sprint 6, ~late September) and the December Travel-Wrapped season. Both exist to pour attention into the artifact->share->signup loop, so **neither launch happens until the flyover export (FLYOVER_EXPORT.md) and public Wrapped pages (PUBLIC_WRAPPED.md) are live** — they are the demo.

---

## Launch A: Product Hunt

### Go/no-go prerequisites (check 2 weeks before)

- [ ] Flyover video export works on web + APK, watermarked with the domain (FLYOVER_EXPORT.md)
- [ ] Public Wrapped / album pages have a signup CTA and carry `?ref=` (PUBLIC_WRAPPED.md, REFERRAL_LOOP.md)
- [ ] Time-to-first-pin is short enough that a PH visitor gets their first globe pin in one sitting (ONBOARDING.md) — PH traffic is one-shot; if activation is broken, postpone
- [ ] Custom domain live, transactional email working ([DOMAIN_AND_EMAIL.md](DOMAIN_AND_EMAIL.md)) — a vercel.app URL on PH reads as unfinished
- [ ] Metrics dashboard readable in real time (METRICS.md)
- [ ] App on Play production, or at minimum an open-testing link ([PLAY_STORE.md](PLAY_STORE.md))

### Assets (build the week before)

- [ ] **Hero: 60-second flyover demo video.** Structure: 0-5s a real globe spinning with pins (no logo intro), 5-25s the flyover across one user's year of trips, 25-40s creating an album -> pin appears, 40-55s Wrapped highlights, 55-60s logo + domain. Screen-recorded from the real product; no mockups.
- [ ] **Gallery images (5-6), led by the globe:** 1) globe with a full year of pins, 2) flyover mid-flight, 3) Wrapped summary screen, 4) album detail with photos + map, 5) travel card export, 6) feed. Each with a one-line caption overlay.
- [ ] Tagline (60 chars max), e.g.: "Your travels on a 3D globe you can fly through and share" — write 5, pick 1
- [ ] Description (260 chars), first-comment draft (below), maker profile filled out
- [ ] "Coming soon" teaser page on PH live 1-2 weeks ahead to collect followers

### First-comment draft (edit to taste, keep the shape)

> Hey PH — solo builder here. I built Adventure Log because my trips were rotting in my camera roll. You drop your photos in, it reads where they were taken, and your life shows up as pins on a 3D globe you can fly through — then export the flyover as a video, or share your year as a Travel Wrapped.
>
> Everything is free right now. Two things I'd love from you: brutal feedback on the first-run experience, and — if you've traveled this year — post your globe. I'll be here all day answering everything.

### Hunter and timing

- Self-hunt. Hunter identity barely moves ranking anymore; a maker who answers comments all day moves it a lot.
- Launch **12:01 AM Pacific**, Tuesday, Wednesday, or Thursday. Avoid days adjacent to major keynote events. Sunday/Monday have less traffic but less competition — only consider if the week is stacked.
- You get 24 hours from 12:01 AM PT. Clear the whole day. No deploys that day; code-freeze the day before.

### Launch day, hour by hour (Pacific)

| Time | Action |
|---|---|
| 00:01 | Listing goes live. Verify video plays, links work, ?ref= tracking fires on PH referrals |
| 00:05 | Post first comment. Send the "we're live" message to everyone who said they'd support (testers, creators from outreach waves, friends) — link, no upvote begging (PH penalizes it) |
| 01:00 | Post on personal socials + relevant Discords/Slacks you're genuinely a member of |
| 07:00-12:00 | Peak traffic. Reply to **every** comment within minutes. Watch error logs and signup funnel; hotfix only if something is on fire |
| 12:00 | Post a mid-day update comment (something shipped-during-launch or a stat like "X globes created today") |
| 15:00-20:00 | Second engagement pass; EU wakes up — reply to late comments |
| 23:00 | Thank-you comment. Screenshot final stats |

### Post-launch (48 hours)

- [ ] DM every commenter who showed real interest; ask the top 5 for a 15-min call
- [ ] Write down: visitors, signups, first-pins, exports, signups-per-share for the PH cohort (METRICS.md)
- [ ] Add "featured on Product Hunt" to the site only if the result is worth showing
- [ ] Feed learnings into the Sprint 6 decision gate ([PLAYBOOK.md](PLAYBOOK.md))

---

## Launch B: December Travel-Wrapped season

Spotify Wrapped drops in early December and for ~2 weeks the internet posts year-in-review content. Adventure Log's Wrapped + globe is made for this window. This is a season, not a day.

### Ship-by dates (November)

| Date | Milestone |
|---|---|
| Nov 6 | Wrapped 2026 scope locked: what's in the recap, share/export surfaces, public page polish (PUBLIC_WRAPPED.md). No new ideas after this date |
| Nov 14 | Feature freeze. Wrapped generation works against real accounts; flyover-in-Wrapped export works on web + APK |
| Nov 17 | Play release containing Wrapped submitted (review + phased rollout need lead time — [PLAY_STORE.md](PLAY_STORE.md)) |
| Nov 21-28 | Beta: testers + creator contacts get Wrapped early, asked for feedback AND permission to post theirs on day 1 |
| Nov 30 | Wrapped 2026 live for everyone. In-app entry point visible on the feed |

### Seeded posts (Dec 1-7)

The mechanic only works if people SEE globes before making theirs.

- [ ] Post your own Wrapped + flyover first, everywhere, Dec 1
- [ ] Line up 5-10 people (beta group, creators from OUTREACH waves — see [OUTREACH_TEMPLATES.md](OUTREACH_TEMPLATES.md)) to post theirs Dec 1-5, staggered, not all at once
- [ ] Every seeded post uses the same caption mechanic: **"post your globe"** + the hashtag + their `?ref=` link in bio/comment
- [ ] Reply to every quote/duet/stitch from the app's account or your personal one — the first 48h of replies decide whether a mechanic moves

### Hashtag mechanics

- One hashtag, decided by Nov 14, used with zero variation: `#TravelWrapped` (or `#TravelWrapped2026` if the shorter one is squatted — check TikTok/IG before locking; founder decision)
- The phrase to repeat in every caption: **"post your globe"** — it names the action, not the app
- The in-app share sheet should pre-fill caption + hashtag so users don't have to think (small build item; coordinate with PUBLIC_WRAPPED.md)
- Do NOT run a giveaway/contest — prize mechanics attract prize hunters, not travelers, and create moderation work

### During the season (Dec 1-21)

- [ ] Daily 30-min pass: find every public post of a globe/Wrapped, comment from the app account, reshare the best
- [ ] Watch exports-per-active and signups-per-share daily (METRICS.md); if exports are high but signups low, the public landing page is the problem — fix that, not the promotion
- [ ] Creators who posted get a personal thank-you + early look at whatever ships next
- [ ] Jan 2-5: write the season retro — what worked feeds next year's plan

### Founder decisions needed

1. Hashtag final call (check squatting first).
2. Whether Wrapped season doubles as the PH launch if Sprint 6 slipped — do NOT do both in the same week; PH mid-November or skip to January.
