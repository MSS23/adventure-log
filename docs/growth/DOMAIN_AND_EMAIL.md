# Domain + transactional email cutover

The app currently lives at `https://adventure-log-azure.vercel.app`. That URL works but undercuts every share link, the Play listing, and email deliverability. This doc is the full cutover: buy a domain, point Vercel at it, update env + APK, fix Supabase auth redirects, and verify the domain in Resend so transactional email actually sends.

**Order matters.** Do steps 1-4 in one sitting (the app tolerates both domains during transition), then 5-6. Budget: ~2 hours of work + DNS/verification wait.

**Known constraint:** you do NOT own `adventurelog.app` or `adventurelog.com` — and the code's email fallback references adventurelog.app anyway (step 6 fixes that). Pick a domain you can actually get.

## 1. Buy the domain

- [ ] Check availability for candidates: `adventurelog.io`, `adventure-log.app`, `getadventurelog.com`, `adventurelog.travel`, `advlog.app` — pick one that's short, spellable out loud, and available. (Founder decision.)
- [ ] Registrar: Cloudflare Registrar or Porkbun (at-cost pricing, free WHOIS privacy). Avoid GoDaddy upsell mazes.
- [ ] Turn on auto-renew immediately. A lapsed domain kills every share link ever posted.

Everything below writes `<domain>` — substitute yours.

## 2. Point it at the Vercel project

Project: **adventure-log**, team **mss23s-projects**.

- [ ] Vercel dashboard -> adventure-log -> Settings -> Domains -> Add `<domain>` and `www.<domain>`
- [ ] Add the DNS records Vercel shows at your registrar (A `76.76.21.21` for apex, CNAME `cname.vercel-dns.com` for www — use whatever Vercel displays)
- [ ] Set `<domain>` as **primary**; configure `www` and `adventure-log-azure.vercel.app` to redirect to it. Keep the azure domain attached forever — old share links must keep working.
- [ ] Verify HTTPS works on the new domain (Vercel issues the cert automatically)

## 3. Update environment variables

In Vercel (Settings -> Environment Variables, Production + Preview) **and** in local `.env.local`:

- [ ] `NEXT_PUBLIC_APP_URL=https://<domain>` (SEO/OG tags, sitemap, robots)
- [ ] `NEXT_PUBLIC_API_BASE_URL=https://<domain>` (the origin the mobile WebView calls for `/api/*`)
- [ ] While you're in there, fix the known env problems: `SUPABASE_SERVICE_ROLE_KEY` is misnamed `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in Vercel, and `NEXT_PUBLIC_SUPPORT_EMAIL` should be set on web too
- [ ] Redeploy. **Reminder for this project:** pushes to master build as previews and do NOT auto-promote — promote via dashboard or `vercel promote <dpl_id> --scope mss23s-projects --yes`

### The APK must be rebuilt

`NEXT_PUBLIC_API_BASE_URL` is **baked into the static mobile bundle at build time**. Any APK/AAB built before the change still calls the old origin. After updating `.env.local`:

```powershell
node scripts/mobile-build.mjs
node node_modules/@capacitor/cli/bin/capacitor sync android
cd android; $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; .\gradlew bundleRelease
```

(Never `npm run` in this workspace — the `&` in the path breaks npm. See [PLAY_STORE.md](PLAY_STORE.md) for the full release flow.)

The azure domain keeps serving the API during transition, so already-installed builds don't break — but ship the rebuilt binary in the next Play release.

## 4. Supabase auth redirect allowlist

Supabase dashboard -> Authentication -> URL Configuration:

- [ ] **Site URL**: `https://<domain>`
- [ ] **Redirect URLs** — the allowlist must contain (keep old entries during transition):
  - `https://<domain>/**`
  - `https://adventure-log-azure.vercel.app/**` (old links, installed APKs)
  - `http://localhost:3000/**` (dev)
  - any `com.adventurelog.app://` / `capacitor://localhost` entries already present (native)
- [ ] Test: password reset email + email confirmation link land on the new domain and complete the flow

## 5. Verify the domain in Resend (transactional email)

Resend refuses to send from unverified domains, and Gmail addresses can't be senders.

- [ ] Resend dashboard -> Domains -> Add `<domain>` (or `mail.<domain>` subdomain — keeps root DNS cleaner)
- [ ] Add the DNS records Resend gives you at the registrar: DKIM (TXT/CNAME), SPF (TXT), and the Return-Path/MX records if shown
- [ ] Wait for "Verified" status (minutes to a few hours)
- [ ] Send a test email from the Resend dashboard to msidhu861@gmail.com; check it doesn't land in spam

## 6. Fix EMAIL_FROM (currently broken by default)

`src/lib/services/email.ts:8`:

```ts
const FROM_EMAIL = process.env.EMAIL_FROM || 'Adventure Log <noreply@adventurelog.app>'
```

The fallback domain `adventurelog.app` is **not owned by us** — if `EMAIL_FROM` is unset, sends fail Resend's domain check (or worse, appear to spoof someone else's domain). Fix:

- [ ] Set in Vercel (Production + Preview) and `.env.local`: `EMAIL_FROM=Adventure Log <hello@<domain>>` (or `noreply@<domain>`; `hello@` gets fewer spam flags and lets people reply)
- [ ] Optionally change the code fallback to throw or log loudly instead of defaulting to a domain we don't own (small PR, worth it)
- [ ] Trigger a real transactional email end-to-end (signup confirmation or password reset) and confirm the From address + inbox placement

## 7. Share links, watermark, and stragglers

- [ ] **No code change needed for share URLs and the export watermark**: everything goes through `getWebOrigin()` (`src/lib/utils/native-routes.ts`), which returns `NEXT_PUBLIC_API_BASE_URL` on native and `window.location.origin` on web — both follow the env/domain automatically once steps 2-3 are done
- [ ] But grep for hardcoded fallbacks and update them in one pass: `grep -r "adventure-log-azure" src/` — known hit: `src/app/(fullscreen)/wrapped/page.tsx` uses the azure URL as a literal fallback. Legal pages and any OG metadata may too.
- [ ] Update the Play Console listing (website + privacy policy URL) once live
- [ ] Update link-in-bio / social profiles as they get created

## Verification checklist (after everything)

- [ ] `https://<domain>` loads the app; `https://adventure-log-azure.vercel.app` redirects to it
- [ ] Signup + login + password reset work on the new domain
- [ ] A share link copied from the app (album/Wrapped) uses the new domain and carries `?ref=`
- [ ] Rebuilt APK: API calls succeed (trips, geocode, achievements) against the new origin
- [ ] Transactional email arrives from `@<domain>`, not the unowned fallback
- [ ] `https://<domain>/privacy` loads (needed for [PLAY_STORE.md](PLAY_STORE.md))

## Founder decisions needed

1. Which domain to buy (step 1 candidates — check availability, ~$10-35/yr).
2. Sender identity: `hello@` vs `noreply@`, and whether to set up a receiving mailbox (registrar email forwarding to msidhu861@gmail.com is free and enough for now).
