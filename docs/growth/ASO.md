# Play Store listing (ASO)

Copy and asset plan for the Google Play listing. Submission mechanics are in [PLAY_STORE.md](PLAY_STORE.md). We are a zero-recognition challenger app: every character works for discovery, every screenshot works for conversion.

Google Play specifics that shape everything here:
- **Indexed for search:** title (30 chars, strongest signal), short description (80), full description (4,000 — aim for natural 2-3% density on target keywords).
- **Prohibited in title:** emojis, ALL CAPS, "best"/"#1"/"free", calls to action.
- Screenshots: 2-8 phone screenshots; feature graphic 1024x500 required for any featured placement; store video barely gets played on Android (~6% tap rate) — screenshots carry the load.

## Positioning line

Everything centers on one phrase: **"your travels on a 3D globe."** It's the differentiator no travel journal competitor owns, and it's what the screenshots can prove in half a second.

## Keyword rationale

| Keyword | Why | Where it goes |
|---|---|---|
| travel journal | Highest-intent category phrase; people who search it want exactly this job done | Title, short desc, full desc |
| travel map | The visual hook in words; bridges to the globe | Title ("3D travel map" variant), full desc |
| trip tracker | Utility phrasing; catches people who think in "tracking" not "journaling" | Full desc, repeated naturally |
| travel diary | Synonym cluster with journal; costs nothing to include in full desc | Full desc |
| Supporting: photo map, travel log, countries visited, year in review, travel wrapped | Long-tail and seasonal (December) | Full desc body |

Don't stuff. Google's NLP penalizes it, and the full description is also read by humans deciding whether to install.

## Title (30 chars max)

Primary:

> `Adventure Log: 3D Travel Map` (28 chars)

Variant for the first title experiment:

> `Adventure Log: Travel Journal` (29 chars)

Brand first (it's the app's name), one keyword phrase after the colon. "3D Travel Map" is the differentiated claim; "Travel Journal" is the bigger search category — let the experiment decide (below).

## Short description (80 chars max)

Primary:

> `Your travels on a 3D globe. A travel journal for trips, photos and memories.` (77)

Variant:

> `Log trips on a 3D globe. Map your photos, track countries, share your year.` (75)

## Full description (draft — 4,000 char limit, this is ~1,600; expand with real feature names as they ship)

> **See every trip you've ever taken on a 3D globe.**
>
> Adventure Log is a travel journal that turns your camera roll into a living travel map. Add your photos and the app reads where they were taken — every city becomes a pin on an interactive 3D globe you can spin, zoom, and fly through.
>
> **Your travel map, built from your photos**
> - Drop in photos and watch pins appear — location comes straight from the pictures
> - Fly across your globe from trip to trip and relive the route
> - Track countries visited and watch the map fill in
>
> **A travel journal that keeps itself**
> - Organize trips into photo albums with dates, places, and notes
> - Your travel diary stays private by default — share only what you choose
> - Wishlist the places you haven't been yet
>
> **Share the journey**
> - Export a flyover video of your globe for TikTok or Instagram
> - Get your Travel Wrapped — a year-in-review of your trips, countries, and favorite moments
> - Share albums and travel cards with friends, or keep it all to yourself
>
> **Travel with your people**
> - Follow friends and see their trips on the map
> - Compare travels and find the places you've both been
>
> Whether you're a study-abroad student collecting countries, a backpacker logging the long way around, or you just want your trips somewhere better than a camera roll — Adventure Log is the trip tracker that makes your travels worth looking back on.
>
> Start free. Add one trip. See your globe.

(Adjust the last block if pricing changes; "Start free" is fine in the description, just never in the title.)

## Screenshot storyboard (8 slots — globe first, Wrapped second, feed last)

Captions rendered on the image, 4-7 words, device frame, consistent background. First 2-3 are all most people see.

| # | Screen | Caption |
|---|---|---|
| 1 | Globe, fully pinned with a year of travel, mid-rotation | "Your travels on a 3D globe" |
| 2 | Wrapped summary screen (countries, distance, top trip) | "Get your Travel Wrapped" |
| 3 | Flyover in motion (or export share sheet) | "Fly through your trips — export the video" |
| 4 | Album detail: photos + location + map strip | "Photos become pinned travel albums" |
| 5 | Add-photos flow with location auto-detected | "Drop in photos. Pins appear." |
| 6 | Passport / countries-visited view | "Track every country you visit" |
| 7 | Map or wishlist view | "Plan the places still on your list" |
| 8 | Feed with friends' trips | "See where your friends went" |

- Use a populated, real-looking account (a dressed tester account is fine) — empty states kill conversion.
- Feature graphic (1024x500): the globe, dark background, logo, the one line: "Your travels on a 3D globe." No screenshots inside it.
- Skip the store video at launch (low play rate on Android; the flyover video budget goes to TikTok/PH instead — see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)). Revisit after listing conversion data exists.

## What to A/B test (Store Listing Experiments)

Console -> Store listing experiments. Rules: one experiment at a time, up to 3 variants + current, run 7+ days, and only start once there's enough install traffic for a readable result (with tiny traffic, run each test longer and accept directional answers).

Priority order — test big swings, not comma placement:

1. **Icon** (biggest lever at small scale): globe mark vs. pin/compass mark
2. **First screenshot**: globe hero vs. flyover-in-motion vs. Wrapped
3. **Short description**: "3D globe" lead vs. "travel journal" lead (the two drafts above)
4. **Title keyword** (via experiment where available, else just change and watch): "3D Travel Map" vs. "Travel Journal"
5. Seasonal: in late November, swap screenshot #2 to Wrapped-2026-specific art for December ([LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md))

Log every experiment (dates, variant, result) at the bottom of this file so learnings survive.

## Experiment log

| Date | Element | Variants | Result |
|---|---|---|---|
| — | — | — | — |
