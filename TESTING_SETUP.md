# Testing Setup

Everything you need to do before inviting friends to test Adventure Log. Most
of the app works with zero setup — this list is the handful of Supabase/config
steps that unlock the remaining features.

The **must-do** items are marked ⭐. The rest is optional or already done.

---

## ⭐ 1. Turn off email confirmation (Supabase)

The signup flow uses Supabase email/password. Supabase's **built-in email
sender is rate-limited to a few messages per hour, project-wide**, so if
confirmation is on and several friends sign up at once, most won't get their
email. For a friends test, disable confirmation so signup logs them straight
in.

**Dashboard → Authentication → Providers → Email → uncheck "Confirm email" →
Save.**

The signup page already handles both modes: with confirmation off, it receives
a session and sends the user straight to the dashboard.

> Re-enable confirmation (and add custom SMTP — see step 4) before any real
> public launch.

---

## ⭐ 2. Set the auth URLs (Supabase)

**Dashboard → Authentication → URL Configuration:**

- **Site URL** → where you're testing:
  - Local: `http://localhost:3000`
  - Deployed: your Vercel URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs** → add the password-reset return page (and the deployed
  equivalent if testing on Vercel):
  - `http://localhost:3000/reset-password/update`
  - `https://your-app.vercel.app/reset-password/update`

Without the redirect URL, the password-reset email link is rejected.

---

## ⭐ 3. Enable live trip sync (apply migration 40)

Collaborative trip planning works without this, but a friend's newly-added pin
won't appear until you **refresh**. To make pins/colors update live, add the
two trip tables to the realtime publication. Pick one:

**Option A — SQL Editor (fastest):**
Dashboard → **SQL Editor** → paste the contents of
`supabase/migrations/40_trip_realtime.sql` → **Run**. (It's idempotent — safe
to run more than once.)

**Option B — Replication UI:**
Dashboard → **Database → Replication** → open the `supabase_realtime`
publication → toggle **`trip_pins`** and **`trip_members`** on.

---

## (Optional) 3b. Trip creation RLS — already fixed in code

End-to-end testing found that the live `trips` table lost its INSERT policy
during the old Clerk auth migration, which would have broken **trip creation**
for everyone. The `POST /api/trips` route now creates trips via the service-role
client (owner is forced to the session user), so **trip creation works with no
action needed**. Optionally apply `supabase/migrations/41_fix_trips_insert_policy.sql`
to restore the correct RLS policy at the database level — not required for
testing.

## ⭐ 4. Create a second account

The database currently has **one user**, so the collaborative/social features
need a second person to exercise:

- Trip co-planning + live pins (red-for-mine / green-for-theirs)
- Album collaboration invites + notifications
- Travel Twins, the friends feed, follow requests, private-album access requests

Use a friend's account or a throwaway email (with confirmation off per step 1,
any email works without a real inbox).

---

## 4b. (Optional) Reliable transactional email

Only needed if you want to test the **password-reset** email beyond a couple of
sends, or you re-enable signup confirmation. Add a custom SMTP provider
(Resend, SendGrid, Postmark, etc.):

**Dashboard → Authentication → SMTP Settings.**

Skippable for a small friends test — the built-in sender works for a handful of
emails before rate-limiting.

---

## Already done — no action needed

- **Storage buckets**: `avatars`, `photos`, `covers` all exist and are public →
  photo/avatar/cover uploads work.
- **OAuth**: not used. The app is email/password only; the `/sign-in` and
  `/sign-up` Clerk routes are dead stubs and can be ignored.
- **Profile creation**: handled automatically on first login (with a DB trigger
  as backup).
- **RLS**: enabled on all tables. Recent commits added app-level ownership
  guards on the trip routes as defense-in-depth.
- **Environment variables**: `.env.local` already has
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`.

---

## Run it

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
```

Or deploy to Vercel and point Site URL / redirect URLs (step 2) at that domain.

---

## Quick smoke test

Once two accounts exist, walk through:

- [ ] Sign up → land in dashboard (confirmation off)
- [ ] Create an album, upload photos, set a cover
- [ ] Follow the other account; check the friends feed
- [ ] Make an album **private** / **friends-only** → from the other account,
      open its public link → "Request to Follow" → owner accepts → access opens
- [ ] Invite the other account to collaborate on an album → they see the invite
      on their **dashboard** + a notification → accept
- [ ] Create a trip → paste a Google Maps link (or `lat,lng`) → a pin appears
- [ ] Invite the other account to the trip → both add pins → confirm each
      member's pins show in their own color (live if step 3 is applied)
- [ ] Log out → you land on `/login`
- [ ] (If SMTP configured) "Forgot password?" → reset email → set new password

---

## Optional hardening (not required to test)

The `trips` / `trip_members` / `trip_pins` RLS policies were churned during an
old auth migration. App-level guards already protect those routes, so this is
belt-and-suspenders only. To verify the live policies, run in the SQL Editor:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('trips', 'trip_members', 'trip_pins')
ORDER BY tablename, policyname;
```
