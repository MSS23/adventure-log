# Clerk Migration Plan

A phased plan for migrating Adventure Log from Supabase Auth to **Clerk for
auth + Supabase for DB only**, executable in a future session.

> **Why this plan exists:** the user wanted Clerk because Google sign-in
> appeared broken. We instead added Google/Apple sign-in to the existing
> Supabase Auth (~2 hours, see `AUTH_GOOGLE_APPLE_SETUP.md`). If you still want
> Clerk for its UX polish, managed MFA, and easier provider expansion, this
> plan executes in roughly 35–55 hours.

---

## When to revisit this plan

Pick Clerk if any of these become true:

- You want to add 3+ more sign-in providers (Apple, GitHub, Microsoft, magic
  link, passkeys) and find Supabase's per-provider config tedious.
- You want managed MFA / 2FA without building it yourself.
- You want pre-built `<UserButton />` / `<UserProfile />` / `<OrganizationProfile />`
  components instead of designing them.
- You expect the user account UI to be a meaningful surface in your product
  (organizations, billing, multi-tenant, etc.).

Pick "stay on Supabase Auth" if:

- You're below 100K MAU and price-sensitive (Clerk is ~$1,825/mo at 100K MAU
  vs Supabase Auth: free).
- You don't want a second vendor in your auth-critical path.
- You're shipping iOS/Android via Capacitor soon and don't want to debug the
  known Clerk-in-WKWebView OAuth issue.

---

## Pricing reality check (2026)

| MAU | Clerk monthly cost |
|---|---|
| ≤ 10,000 | **Free** |
| 50,000 | $25 + 40K × $0.02 = **$825** |
| 100,000 | $25 + 90K × $0.02 = **$1,825** |
| 1,000,000 | **~$19,825** |

Supabase Auth is free at every tier. Plan accordingly.

---

## Architecture: Clerk + Supabase native integration

As of April 2025, Clerk and Supabase shipped a **native third-party auth**
integration. The legacy "JWT template" pattern is deprecated.

```
┌──────────────┐    user clicks      ┌────────┐
│  Browser     │ ─────────────────▶  │ Clerk  │  (Clerk owns identity)
│              │ ◀─────────────────  │        │
└──────────────┘   session token     └────────┘
       │
       │ every request includes Clerk session token
       ▼
┌──────────────┐                     ┌──────────┐
│  Next.js     │ ──── postgrest ───▶ │ Supabase │  (Supabase owns data, RLS
│  middleware  │   (token forwarded) │   PG     │   reads Clerk's JWT claims)
└──────────────┘                     └──────────┘
```

**Key fact:** Supabase RLS policies must read `auth.jwt() ->> 'sub'` instead
of `auth.uid()`, because Clerk's `sub` claim is a string like `user_2abc…`,
not a UUID. The `users.id` column type therefore changes from `uuid` to
`text`, and every foreign key referencing it changes too.

---

## Phase 0 — Prep (2–3 hours)

- [ ] Create a Clerk account, set up a **Development** instance.
- [ ] Add Clerk env vars to `.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
  CLERK_SECRET_KEY=sk_test_…
  CLERK_WEBHOOK_SIGNING_SECRET=whsec_…
  ```
- [ ] In Clerk Dashboard → **User & Authentication**, enable: Google, Apple,
  Email + Password (match what Supabase Auth offers today).
- [ ] In Supabase Dashboard → **Authentication → Third Party Auth**, add Clerk
  as a provider. Paste your Clerk frontend API URL.
- [ ] Branch: `git checkout -b feat/clerk-migration`.

## Phase 1 — Run Clerk and Supabase Auth side by side (4–6 hours)

Goal: prove the Clerk integration works on a single test page before ripping
out anything.

- [ ] `npm install @clerk/nextjs`
- [ ] Wrap `app/layout.tsx` in `<ClerkProvider>` (alongside the existing
  `AuthProvider`, don't remove yet).
- [ ] Create a new test route `app/(test-clerk)/clerk-demo/page.tsx` that uses
  `<SignIn />` and `useUser()`.
- [ ] Update the Supabase client factory to accept a Clerk session token:
  ```ts
  // src/lib/supabase/client.ts
  import { useSession } from '@clerk/nextjs'
  export function useClerkSupabase() {
    const { session } = useSession()
    return createBrowserClient(URL, KEY, {
      accessToken: () => session?.getToken() ?? null,
    })
  }
  ```
- [ ] Verify on the test page: a query under RLS still works because Supabase
  forwards the Clerk JWT.

## Phase 2 — Database migration (8–12 hours, the hard part)

- [ ] Create migration `supabase/migrations/20_clerk_id_migration.sql`:
  - [ ] `ALTER TABLE public.users ALTER COLUMN id TYPE text;`
  - [ ] For every FK to `users.id`: drop the FK, change column type to `text`,
    re-add the FK. Tables to update (from existing schema): `albums`,
    `photos`, `stories`, `likes`, `comments`, `follows`, `favorites`,
    `notifications`, `user_levels`, `achievements`, `globe_reactions`,
    `playlists`, `itineraries`, `album_collaborators`.
- [ ] Rewrite RLS policies — sweep every migration file in `supabase/migrations/`:
  - [ ] `auth.uid() = user_id` → `(auth.jwt() ->> 'sub') = user_id`
  - [ ] `auth.uid() = id` → `(auth.jwt() ->> 'sub') = id`
  - [ ] Anywhere `auth.uid()` appears alone, replace with `(auth.jwt() ->> 'sub')::text`
- [ ] Run migrations against a **fresh staging DB** first, never against prod.
- [ ] Add a `clerk_user_id` text column to `users` AS A BACKUP and dual-write
  during cutover; drop after 30 days.

## Phase 3 — User data migration (6–10 hours)

- [ ] Export current Supabase Auth users via `supabase.auth.admin.listUsers()`.
- [ ] Bulk-import to Clerk via `clerk.users.createUser()`. Clerk **accepts
  bcrypt hashes**, so existing email/password users keep their passwords.
- [ ] Build a `legacy_id_to_clerk_id` mapping table.
- [ ] Run a one-time SQL update to remap `users.id` (and every FK) from
  Supabase UUIDs to Clerk string IDs using the mapping table.
- [ ] Google-OAuth-only users: import without password, they re-link Google on
  first sign-in (one extra click; no re-registration).

## Phase 4 — Replace AuthProvider & API routes (8–10 hours)

- [ ] Delete `src/components/auth/AuthProvider.tsx` and `ConditionalAuthProvider.tsx`.
- [ ] Delete `src/lib/hooks/useAuth.ts` (replaced by Clerk's `useUser`/`useAuth`).
- [ ] Replace `useAuth()` consumers with `useUser()` from `@clerk/nextjs`.
  Audit: `grep -rn "useAuth\|user\.id\|profile" src/components/`.
- [ ] In every API route: replace
  ```ts
  const { data: { user } } = await supabase.auth.getUser()
  ```
  with
  ```ts
  import { auth } from '@clerk/nextjs/server'
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- [ ] Update `middleware.ts`: replace the `createServerClient` + `getUser` block
  with `clerkMiddleware()` from `@clerk/nextjs/server`.
- [ ] Replace `/login` and `/signup` pages with Clerk's `<SignIn />` /
  `<SignUp />` — or keep our existing UI and call Clerk's `signIn.create()`.
  The pre-built components save ~750 lines of code.

## Phase 5 — Profile creation webhook (3–5 hours)

Clerk doesn't fire DB triggers. Replace `create_profile_on_signup`:

- [ ] Create `src/app/api/webhooks/clerk/route.ts` that:
  - Verifies the Svix signature.
  - On `user.created`, inserts a row into `public.users` with the Clerk user
    id, email, generated username.
  - On `user.updated`, syncs email/profile data.
  - On `user.deleted`, soft-deletes or removes the row.
- [ ] In Clerk Dashboard → Webhooks → add the endpoint URL.
- [ ] Webhooks are **eventually consistent**, so also upsert the user row on
  the first authenticated request as a safety net (keep AuthProvider's
  "create profile if missing" pattern, just in Clerk-native form).

## Phase 6 — Capacitor mobile (4–8 hours)

- [ ] On iOS, Clerk's OAuth flow can redirect out to Safari instead of staying
  in WKWebView (documented gotcha as of mid-2025). Workarounds:
  - Use Clerk's native iOS SDK if/when stable.
  - Or use the Capacitor In-App Browser plugin to keep the OAuth flow inside
    the app shell.
- [ ] Test sign-in on iOS Simulator + a real device before shipping.
- [ ] Apple Sign In: use Clerk's native iOS Sign in with Apple, not the web
  flow.

## Phase 7 — Cutover & cleanup (2–3 hours)

- [ ] Behind a feature flag, route 5% → 50% → 100% of traffic to the new auth.
- [ ] Monitor Sentry for `userId is null` / RLS-denied / FK violations.
- [ ] After a week of stability, drop the `clerk_user_id` backup column and
  delete `supabase.auth.users` rows (Supabase Auth becomes unused).
- [ ] Remove `@supabase/ssr`'s auth-related imports; keep only DB usage.

---

## Estimated total: 35–55 hours

| Phase | Effort |
|---|---|
| 0 — Prep | 2–3h |
| 1 — Side-by-side | 4–6h |
| 2 — DB migration | 8–12h ⚠️ riskiest |
| 3 — User import | 6–10h |
| 4 — App code | 8–10h |
| 5 — Webhook | 3–5h |
| 6 — Capacitor | 4–8h |
| 7 — Cutover | 2–3h |

---

## Sources

- [Clerk + Supabase native integration (Clerk Docs)](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Clerk + Supabase reference repo](https://github.com/clerk/clerk-supabase-nextjs)
- [Clerk pricing](https://clerk.com/pricing)
- [Migrating user auth from Supabase to Clerk (Felix Vemmer)](https://felixvemmer.com/en/blog/migrate-user-authentication-supabase-clerk-dev)
- [Clerk webhooks (Svix)](https://clerk.com/docs/guides/development/webhooks/syncing)
- [Clerk `createUser` Backend API](https://clerk.com/docs/reference/backend/user/create-user)
- [iOS WebView Clerk OAuth gotcha (Ionic forum)](https://forum.ionicframework.com/t/ios-webview-redirects-to-safari-after-clerk-authentication-production-vs-development-issue/248720)
