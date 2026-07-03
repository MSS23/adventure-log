# Google Play: from debug APK to production

Operator guide for getting Adventure Log onto Google Play. Current state: the Android app builds and runs as a **debug** APK (`android/app/build/outputs/apk/debug/app-debug.apk`, signed with the shared Android debug keystore). Nothing debug-signed can ever go to Play. This doc takes you from that to a phased production rollout.

App identity: `applicationId com.adventurelog.app`, `versionCode 1`, `versionName "1.0"` (`android/app/build.gradle`).

Listing copy, keywords, and screenshots live in [ASO.md](ASO.md). Do the domain work in [DOMAIN_AND_EMAIL.md](DOMAIN_AND_EMAIL.md) **before** submitting — the listing needs a privacy policy URL and the binary bakes in the API base URL.

## Realistic timeline (personal account, first app)

| Step | Elapsed time |
|---|---|
| Console account + identity verification | 1-3 days |
| Release keystore + first .aab build | half a day |
| Store listing, data safety, content rating | half a day |
| Closed testing review + tester opt-ins | 2-5 days |
| **Mandatory 14-day closed test** (new personal accounts) | 14 days minimum |
| Apply for production access + review | 3-7 days |
| Production review + phased rollout start | 2-7 days |
| **Total** | **~4-6 weeks** |

The 14-day clock is the long pole. Start closed testing in Sprint 1 (see [PLAYBOOK.md](PLAYBOOK.md)) even if the listing is rough.

## 1. Google Play Console account

- [ ] Go to https://play.google.com/console and sign up as an **individual** developer (one-time $25 fee)
- [ ] Use a Google account you'll keep forever (msidhu861@gmail.com is fine); the developer name shows publicly
- [ ] Complete identity verification (government ID; can take a couple of days)
- [ ] Note the constraint this triggers: **personal accounts created after Nov 2023 must run a closed test with at least 12 testers continuously opted in for 14 days before they can apply for production access.** Plan around it; there is no bypass.

## 2. App signing — create and BACK UP a release keystore

**Flag: the project currently has no release signing config.** `android/app/build.gradle` defines no `signingConfigs` — builds use the debug keystore. You must create an **upload keystore** once, and if you lose it *and* its passwords you lose the ability to update the app (Play App Signing softens this, but treat the keystore as irreplaceable).

Generate it with the JBR's keytool (system Java is too old — same rule as Gradle builds):

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore "$env:USERPROFILE\keystores\adventure-log-upload.jks" `
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

- [ ] Create `%USERPROFILE%\keystores\` first; do NOT put the keystore inside the repo
- [ ] Record the store password, key password, and alias in your password manager
- [ ] **Back up the .jks file to at least two places that are not this laptop** (password manager attachment + cloud drive). Do this the same day you create it.
- [ ] In Play Console, enroll in **Play App Signing** (default for new apps): Google holds the app signing key; your .jks is the *upload* key. If the upload key is ever lost, you can request a reset — but only with Play App Signing enabled.

Wire it into Gradle. Create `android/key.properties` (add to `.gitignore` — never commit):

```properties
storeFile=C:\\Users\\msidh\\keystores\\adventure-log-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Then in `android/app/build.gradle`, load it and add a `signingConfigs.release` block referenced by `buildTypes.release`. (Standard Capacitor/Android pattern; keep `debug` untouched.)

## 3. Building the release .aab

Play requires an Android App Bundle (.aab), not an APK. Build flow — remember this workspace's rules: **never `npm run` / `npx`** (the `&` in the repo path breaks npm shell spawns), and **JAVA_HOME must point at the Android Studio JBR**.

```powershell
# 1. Static export (checks NEXT_PUBLIC_API_BASE_URL is set — see DOMAIN_AND_EMAIL.md)
node scripts/mobile-build.mjs

# 2. Sync into android/
node node_modules/@capacitor/cli/bin/capacitor sync android

# 3. Bundle release
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

- [ ] Before every upload: bump `versionCode` in `android/app/build.gradle` (Play rejects duplicate codes); bump `versionName` for user-visible releases
- [ ] Confirm `NEXT_PUBLIC_API_BASE_URL` in `.env.local` points at the production origin — it is baked into the bundle; a wrong value ships a broken app
- [ ] Smoke-test the release build on the Pixel before uploading (`.\gradlew assembleRelease` produces an installable release APK for local testing)

## 4. Store listing requirements

Copy drafts are in [ASO.md](ASO.md). Hard requirements checklist:

- [ ] App name (30 chars), short description (80), full description (4,000)
- [ ] App icon 512x512 PNG, feature graphic 1024x500, 2-8 phone screenshots
- [ ] **Privacy policy URL** — the app ships one at `/privacy` (`src/app/privacy/page.tsx`). Use `https://<your-domain>/privacy` once the domain is live; `https://adventure-log-azure.vercel.app/privacy` works but looks unfinished — do the domain first.
- [ ] Contact email (public): msidhu861@gmail.com until a domain mailbox exists
- [ ] App category: Travel & Local

### Data safety form — answer what the app ACTUALLY collects

Declare exactly this; over- or under-declaring both cause rejections later:

| Data type | Collected? | Purpose | Notes |
|---|---|---|---|
| Email address | Yes | Account management | Supabase email/password auth |
| Name / username | Yes | Account management, app functionality | Profile display name + username |
| Photos | Yes | App functionality | User-uploaded album photos, stored in Supabase Storage |
| Precise location | Yes | App functionality | GPS extracted from photo EXIF for globe pins; device geolocation for the map's locate-me (Capacitor Geolocation) |
| Other user-generated content | Yes | App functionality | Album titles, comments, bios, stories |
| App interactions / diagnostics | Only if monitoring/Sentry is enabled in prod | Analytics | Check what's actually wired before declaring |

Also declare: data encrypted in transit (yes, HTTPS); users can request deletion (account deletion exists in Settings — verify it fully works before submitting, and be ready to provide a **web URL for account deletion**, which Play requires for apps with account creation. `/settings` behind login is acceptable if documented, but a dedicated public page is safer — founder decision).

### Content rating questionnaire

- Category: Social/Communication (the app has UGC: photos, comments, profiles)
- Answer **yes** to user-generated content and user interaction/sharing; **yes** to sharing location with other users (public albums pin locations)
- Answer no to violence/sexual content/gambling/etc.
- Expect a **Teen** (or regional equivalent) rating because of unmoderated UGC. That is normal for social apps.
- **Flag:** Google's UGC policy requires in-app **report content** and **block user** mechanisms. Verify these exist and work before the production submission; if they don't, that's a build item (small, but blocking).

## 5. Closed testing track (do this FIRST)

- [ ] Create a release on the **Closed testing** track (default "Alpha" track is fine), upload the .aab, write brief release notes
- [ ] Create a tester email list in Console and add **12-20 real Google accounts** (friends, family, classmates). Each tester must open the opt-in link and install from Play.
- [ ] The 14-day / 12-testers-continuously-opted-in requirement is enforced automatically; if testers drop out, the clock can stall — recruit 20 so 12+ always hold
- [ ] **Important distinction:** the 40 in-app tester accounts (`tester1..tester40@adventurelog.test` / `AdventureLog2026!`) are **logins inside the app**, useful so Play testers and Google reviewers can explore a populated account without creating one. They are NOT Google accounts and do NOT count toward the 12-tester requirement. Verify these accounts still exist in prod before handing them out (seeded accounts were purged once before; re-seed via `scripts/seed-test-accounts.mjs` if needed).
- [ ] Put one tester login (e.g. tester1) in the Console's **App access** section so Google's reviewers can get past the login screen — required for review
- [ ] During the 14 days: watch **Android Vitals** (crash rate must stay under ~1.1%, ANR under ~0.5% — these affect ranking later), fix what testers hit, upload new builds to the same track (bump versionCode each time; the clock keeps running)

## 6. Production + phased rollout

- [ ] After 14 days, Console unlocks "Apply for production access" — answer the questions about your testing honestly (what you tested, what you fixed)
- [ ] Once granted, create a **Production** release with the current .aab
- [ ] Use a **staged rollout**: start at 10-20%, watch vitals and reviews for 3-4 days, then 50%, then 100%. You can halt a staged rollout if a bad crash appears; you cannot un-ship 100%.
- [ ] After full rollout: set up the listing experiments cadence from [ASO.md](ASO.md)

## Founder decisions needed

1. Where the release keystore backups live (pick two locations, today).
2. Whether to build a public web account-deletion page or document the login-gated Settings flow to Google.
3. Confirm report-content / block-user exists in-app (UGC policy blocker if not).
4. Recruit the 12-20 real-human testers — this is a people task no script can do.
