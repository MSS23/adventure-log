# Adventure Log database migrations

Migrations are forward-only SQL files and must be applied in numeric order.
Never edit a migration that has already reached staging or production; add a
new migration instead.

The current application schema contract is stored in `EXPECTED_VERSION`.
`81_release_schema_version.sql` introduces the forward schema-version RPC used
by `/api/health` and the release verifier. It also checks that critical tables
from the existing migration history are present before marking a database
current.

Run these checks before release:

```bash
npm run check:migrations
npm run check:migrations:remote
```

The remote command reads `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local` and calls
`get_app_schema_version()`.

## Legacy numbering

The historic migration set contains two version-60 files. They may already
have been applied manually, so renaming them would create more ambiguity. The
checker reports this known condition as a warning. All new migrations must use
a unique integer greater than the value in `EXPECTED_VERSION` and update the
schema-version row/function as their final step.

## Release order

1. Create and verify a database backup.
2. Apply the candidate migration to staging.
3. Run authenticated E2E journeys against staging.
4. Apply the same migration to production.
5. Verify the remote schema version before deploying application code that
   requires it.

See `docs/RELEASE_RUNBOOK.md` for rollback and environment requirements.
