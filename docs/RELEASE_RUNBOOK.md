# Adventure Log release runbook

This is the required path from a change to a public release. Production must
never be used for destructive E2E fixtures.

## One-time platform setup

1. Create a separate Supabase staging project and a Vercel staging environment.
2. In the GitHub `staging` environment, set:
   - secrets: `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`
   - variables: `STAGING_E2E_ENABLED=true`, `E2E_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_PROJECT_REF`
3. Protect `master`: require `Release Gate`, one review, resolved conversations,
   and disallow direct pushes/force pushes.
4. Configure Vercel so production deploys only after required GitHub checks, or
   use a manual production promotion. Preview/staging deployments may remain automatic.
5. Add the Android upload keystore outside Git. Copy
   `android/keystore.properties.example` to `android/keystore.properties` and
   populate it through the protected release environment.
   For GitHub builds, configure the `android-release` environment secrets
   described in `.github/workflows/android-release.yml`.
6. Confirm Supabase Auth redirect URLs include the production/staging web URLs
   and `com.adventurelog.app://auth/callback`.
7. Configure Sentry alert rules, uptime alerts, a support address, and a named
   incident owner. Configure Mapbox, Resend, Anthropic, and image moderation or
   keep their dependent product surfaces disabled.

## Every candidate

1. Apply migrations to staging in numeric order. Migration 81 refuses to mark
   the schema current unless critical earlier tables exist.
2. Run:

   ```bash
   npm ci
   npx eslint . --ext .ts,.tsx
   npm run type-check
   npm test -- --runInBand
   npm run check:migrations
   npm run check:migrations:remote
   npm run check:env:launch
   npm run build
   npm run mobile:build
   ```

3. Let GitHub run public smoke tests and authenticated staging journeys.
4. Test Android login, token refresh, cold start, account switching, upload,
   offline/reconnect, dynamic detail routes, OAuth deep links, and APK upgrade
   on at least two physical devices. Complete 25 cold-start/login cycles with
   no unexpected logout before promoting an auth change.
5. Capture fresh install screenshots with `npm run pwa:screenshots` while the
   candidate server is running, then run Lighthouse/installability checks.
6. Create and verify a pre-release database backup with
   `npm run backup:database`. Store it encrypted outside the repository.
7. Apply migrations to production, run `npm run check:migrations:remote`, deploy,
   then run `npm run verify:production`.

## Android closed beta

Run `npm run mobile:aab`. The command fails closed when signing properties are
missing. Record the printed SHA-256, upload the AAB to Play internal testing,
and verify clean install plus upgrade before moving to closed testing.

## Rollback and recovery

- Application regression: promote the last known-good Vercel deployment.
- Additive schema regression: ship a forward-fix migration; do not edit an
  already-applied migration.
- Destructive schema/data incident: stop writes, preserve logs, restore the
  verified dump into an isolated project, validate it, then coordinate cutover.
- Account deletion: the daily maintenance cleanup must remain scheduled; it
  performs the 30-day hard-delete flow and drains orphaned storage files.

Record release version, commit SHA, migration version, AAB checksum, operator,
deployment URLs, backup location, and test result in the release notes.
