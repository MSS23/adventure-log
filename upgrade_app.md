Phase 0 — Repo hygiene & safety nets
0.1 Environment schema & secrets guardrails

Why: Prevent “works on my machine” and unsafe defaults.
Files: /src/env.ts, .env.example, next.config.ts
Done when: App fails fast on missing/invalid env; .env.example is complete.

Claude Code prompt:

You are contributing to a Next.js 15 (App Router, TS) project called “Adventure Log”.
Stack: React 19, Prisma + PostgreSQL, NextAuth (Google + Credentials), Supabase Storage, Zod, TanStack Query, Tailwind, R3F/Three.js, Jest, Playwright. Target: Vercel.

Task: Add runtime env validation with Zod.

- Create src/env.ts that parses process.env and exports a typed `env` object.
- Required vars: DATABASE_URL (postgres), NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE (server-side only), APP_URL, NODE_ENV.
- Fail hard on missing/invalid values during boot and in route handlers.
- Add `.env.example` with placeholders and short comments.
- Update next.config.ts to expose only safe public keys via `experimental.runtimeEnv`.
- Refactor codebase to import from `src/env`.

Acceptance:

- `pnpm dev` throws if a required var is missing.
- Tree-shaken client bundles expose no secrets.
- All prior imports of process.env replaced by `env`.

  0.2 Pre-commit quality gates

Why: Catch problems before CI.
Files: .husky/, package.json
Done when: lint, typecheck, and staged tests run before commits.

Claude Code prompt:

Add Husky + lint-staged pre-commit hooks:

- Hook runs: typecheck (tsc --noEmit), eslint --fix on staged, prettier --check, and jest -o (changed tests).
- Provide npm scripts: "typecheck", "lint", "format", "test:changed".
- Document in README “Contributing” section.

Acceptance: committing a file with a lint error is blocked with clear output.

0.3 CI pipeline (PR gates)

Why: Keep main always deployable.
Files: .github/workflows/ci.yml
Done when: CI runs typecheck, lint, unit tests, Playwright smoke (API only), Prisma migrate validate, build.

Claude Code prompt:

Create GitHub Action `.github/workflows/ci.yml`:

- Node 20, pnpm.
- cache deps; run: pnpm i, prisma generate, prisma migrate diff --from-empty --to-schema-datamodel, tsc, eslint, jest --ci, next build.
- Playwright: run API-only smoke ('@smoke' tag).
- Upload junit and coverage as artifacts.

Acceptance: PRs show required checks passing; failing tests block merge.

Phase 1 — Data model (secure, indexed, auditable)
1.1 Prisma schema complete + constraints

Why: Correctness & performance from day one.
Files: prisma/schema.prisma, /prisma/seed.ts
Done when: All models from your spec exist with FKs, unique constraints, indexes, soft-delete flags where sensible.

Claude Code prompt:

Design Prisma models per spec: User, Album, AlbumPhoto, AlbumFavorite, Follow, FriendRequest, Like, Comment, Activity, Badge, UserBadge, Challenge, UserChallenge.
Rules:

- Use UUID ids (cuid2).
- Enforce ownership via userId FKs; onDelete: Cascade where logical (e.g., delete album => delete photos, likes, comments).
- Unique guards: Follow(unique followerId+followingId), Like(unique userId+targetType+targetId), FriendRequest(unique requesterId+receiverId, status enum PENDING/ACCEPTED/REJECTED).
- Indexes: createdAt desc on feedables; (albumId, createdAt) for photos; (userId, createdAt) on Activity.
- Soft-delete optional: add `deletedAt` for user-generated content (Album, Photo, Comment).
- Privacy fields: Album.privacy enum {PUBLIC, FRIENDS, PRIVATE}; Photo inherits unless overridden.
- Add `countryCode` (ISO-3166 alpha-2) and optional `city` on Album; Photo can store gps (lat, lng) nullable.

Add seed.ts to create a demo user, 2 albums, 5 photos.

Acceptance: prisma migrate dev succeeds; db creates constraints and indexes.

1.2 Activity & audit trail

Why: Easy moderation and analytics.
Files: schema.prisma, server utilities
Done when: Any mutating action creates an Activity row.

Claude Code prompt:

Add Activity model:

- id, userId, verb enum (ALBUM_CREATED|PHOTO_UPLOADED|LIKE|COMMENT|FOLLOW|BADGE_EARNED), objectType, objectId, createdAt.
- Write a tiny helper `logActivity({userId, verb, objectType, objectId})`.
- Call helper in album create, photo upload, like, comment, follow, badge award (server).

Acceptance: Actions persist activities; basic unit tests validate logging.

Phase 2 — AuthN/AuthZ (defence in depth)
2.1 NextAuth hardened config

Why: Secure sessions, least privilege.
Files: app/api/auth/[...nextauth]/route.ts, src/auth.ts
Done when: Google + Credentials working; bcrypt for passwords; secure cookies; email verification for credentials.

Claude Code prompt:

Implement NextAuth with:

- Providers: Google (profile->User), Credentials (email/pass with bcrypt).
- Email verification: add `emailVerified` on User; block credentials login until verified. Provide a token table and verification route/email (use nodemailer stub for dev).
- Sessions: JWT with 8h expiry, rotation every 1h; secure, httpOnly cookies; set `trustHost`.
- Callbacks: attach `userId` and `role` to token/session.
- Add role enum on User: USER|ADMIN (default USER).

Acceptance:

- Google OAuth sign-in persists user; credentials signup triggers verify email flow; login blocked until verified.
- Cookies are httpOnly and `secure` in prod.

  2.2 Authorisation middleware

Why: Stop cross-user access.
Files: middleware.ts, server utils
Done when: Route protection + per-record ownership checks.

Claude Code prompt:

Create middleware guards:

- Protect /app/(protected)/ routes: redirect unauthenticated to /signin with returnTo.
- API authorisation helper `assertOwnerOrFriend` for Album/Photo/Comment based on privacy rules:
  - PUBLIC: visible to all
  - FRIENDS: visible only if requester is friend (FriendRequest accepted either direction)
  - PRIVATE: only owner
- Use guards in APIs: album get/list, photo list, comments.

Acceptance: Requests by non-owners to PRIVATE return 403; FRIENDS requires accepted friendship.

Phase 3 — Storage, privacy & upload pipeline
3.1 Supabase Storage with RLS and signed URLs

Why: Don’t leak photos.
Files: Supabase policies, server upload handler app/api/uploads/route.ts
Done when: Clients never write direct; uploads go via server which returns signed URL; bucket locked by RLS.

Claude Code prompt:

Implement secure upload:

- Create `photos` bucket.
- Server-only Supabase client uses SERVICE_ROLE.
- POST /api/uploads accepts file (multipart), validates size (<10MB), mime (jpeg/png/webp), scans fields.
- Process with `sharp`: convert to webp, strip metadata, generate responsive sizes (e.g., 320, 768, 1280), and a thumbnail.
- Upload processed variants to `photos/{userId}/{albumId}/{photoId}/{size}.webp`.
- Generate short-lived signed URLs for reads; store only storage path in DB.

Supabase SQL policies (provide .sql file):

- Deny all by default.
- Allow select via `auth.role() = 'service_role'` only (server reads). Clients fetch through Next.js Image or API proxy.

Acceptance: Direct public access to bucket fails; photos render via signed/optimised URLs.

3.2 EXIF/GPS privacy control

Why: Prevent accidental doxxing.
Files: upload handler + DB fields
Done when: If album privacy != PUBLIC, GPS is not persisted; otherwise ask user consent flag.

Claude Code prompt:

Add EXIF/GPS handling:

- On upload, read EXIF (exifr). If album.privacy !== PUBLIC or user unchecked `shareLocation`, do NOT persist lat/lng; always strip metadata from stored images.
- Add album field `shareLocation: boolean` default false; expose in UI.

Acceptance: Private/friends albums never store GPS; public requires explicit opt-in.

Phase 4 — API layer, validation, rate limits
4.1 Zod schemas & typed route handlers

Why: Kill input bugs early.
Files: src/schemas/_.ts, app/api/_/route.ts
Done when: All POST/PUT/DELETE handlers validate with Zod; shared types exported.

Claude Code prompt:

Create Zod schemas for: AlbumCreate/Update, PhotoCreate, CommentCreate, LikeToggle, Follow/FriendRequest, BadgeAward.
Refactor route handlers to parse using `safeParse`, return 400 on errors, and never trust req.body without validation.
Export inferred TS types.

Acceptance: Invalid payloads 400 with structured error; unit tests cover happy/sad paths.

4.2 Central error & response helpers

Why: Consistency.
Files: src/server/http.ts
Done when: Standard JSON shape, correlation id, and logging.

Claude Code prompt:

Add http helpers:

- `ok<T>(data, init?)`, `badRequest(errors)`, `unauthorised()`, `forbidden()`, `notFound()`, `serverError(e)`.
- Add `x-request-id` (generate if absent), log errors with request id.

Acceptance: All API routes use helpers; errors include request id.

4.3 Rate limiting

Why: Abuse & brute-force protection.
Files: middleware.ts, src/server/ratelimit.ts
Done when: IP/user based limits on auth, comments, uploads.

Claude Code prompt:

Implement rate limiting:

- Use an LRU in-memory limiter for dev and an adapter for Redis (if UPSTASH_REDIS_URL present).
- Policies: /api/auth/\* 5/min/IP; /api/comments 20/min/user; /api/uploads 10/min/user.
- Return 429 with retry-after.

Acceptance: Exceeding limits returns 429; limits configurable via env.

Phase 5 — Globe & content UX
5.1 R3F Globe component with performance tiers

Why: Smooth on low-end mobiles.
Files: src/components/globe/\*
Done when: Globe renders markers; auto-downgrades effects on slow devices; 2D fallback.

Claude Code prompt:

Build <Globe/> using React Three Fiber:

- Earth mesh with atmosphere; performance tiers: high (atmosphere + post), medium (reduced poly), low (no atmosphere).
- Detect `navigator.hardwareConcurrency`, memory, FPS sampling for first 2s to choose tier.
- Plot album markers clustered by country; tap marker opens album list.
- Provide 2D fallback (MapLibre) when low tier or `prefers-reduced-motion`.

Acceptance: On low-end emulation, 2D map shows; high-end renders 3D ~60fps.

5.2 Album & photo flows (CRUD + privacy)

Why: Core MVP fully functional.
Files: app/(protected)/albums/_, src/components/_
Done when: Create/edit/delete albums; upload photos; privacy UI with clear copy.

Claude Code prompt:

Implement album UI:

- Create, edit (title, description, country, city, privacy, shareLocation), delete (soft-delete).
- Photo upload with drag&drop, progress, retries, reorder, set cover.
- Empty states; optimistic updates with TanStack Query + server side invalidation.

Acceptance: Core flows work on mobile and desktop; Axe passes for a11y basics.

Phase 6 — Social graph & feed
6.1 Follow & friend flows

Why: Community loop.
Files: app/(protected)/people/\*, APIs
Done when: Follow, unfollow; send/accept/decline friend requests.

Claude Code prompt:

Build social flows:

- User profile page: albums count, countries visited, badges.
- Follow toggle; FriendRequest send/accept/decline; disable follow if friends (or keep both distinct).
- Privacy checks reuse `assertOwnerOrFriend`.

Acceptance: Friend-only albums visible after acceptance; events logged to Activity.

6.2 Likes, comments, notifications (in-app)

Why: Engagement & return triggers.
Files: components + API + DB
Done when: Users can like/comment; notification bell shows unread.

Claude Code prompt:

Implement:

- Like button for albums/photos (debounced, optimistic).
- Comments with threading depth=1, max length 500, rate limit applied.
- Minimal in-app notifications (DB table `Notification` with unread count). Surface: bell icon + dropdown.

Acceptance: Like counts consistent across tabs; unread decrements when viewed.

6.3 Activity feed

Why: Social discovery.
Files: app/(protected)/feed/page.tsx
Done when: Paginated feed of Activity with privacy respected.

Claude Code prompt:

Create /feed:

- Query recent Activity from followed users or friends.
- Card types for album created, photo uploaded, comment, like, badge earned.
- Infinite scroll with IntersectionObserver.

Acceptance: Requests don’t show private content; N+1 queries avoided (use Prisma include/select).

Phase 7 — Gamification
7.1 Badge engine

Why: Motivation loops.
Files: src/gamification/\*
Done when: Badge definitions, award rules, user progress.

Claude Code prompt:

Create badge system:

- Define badges JSON (id, name, rarity, rule type like VISITED_X_COUNTRIES, PHOTOS_UPLOADED_N, SOCIAL_LIKES_N).
- A scheduler or on-demand evaluator runs on activity to award badges and write UserBadge.
- Show progress bars on profile.

Acceptance: Uploading Nth photo triggers badge; duplicate awards prevented by unique constraint.

7.2 Challenges (time-bound)

Files: UI + DB
Done when: Users can join a monthly challenge and see progress.

Claude Code prompt:

Implement Challenges:

- Challenge model (title, startAt, endAt, rule).
- Join/leave; progress computed server-side.
- UI on /challenges.

Acceptance: Participating users see live progress; closed challenges become read-only.

Phase 8 — PWA & offline resilience
8.1 Service worker + offline shell

Why: Great mobile UX.
Files: public/manifest.webmanifest, public/sw.js, Next config
Done when: Installable PWA; offline shell; image caching.

Claude Code prompt:

Add PWA:

- Manifest with icons/splash; display: standalone; scope '/'.
- Custom service worker using workbox-build:
  - Precache app shell routes.
  - Runtime caching: images (CacheFirst), API (StaleWhileRevalidate), globe tiles (CacheFirst with maxEntries & maxAge).
- Register SW in `_app` or root layout effect.

Acceptance: Lighthouse PWA passes; app loads offline to an offline page and cached last feed.

8.2 Background sync for uploads

Why: Patchy connections.
Files: sw.js, upload client
Done when: Photo uploads queue offline and auto-retry.

Claude Code prompt:

Implement background sync:

- If upload fails due to offline, queue in IndexedDB.
- SW listens for `sync` event to retry.
- UI shows queued uploads with cancel.

Acceptance: Turning off network mid-upload queues; restoring network auto-uploads.

Phase 9 — Security headers, CSP, and abuse prevention
9.1 Security headers & CSP

Why: Mitigate XSS/Clickjacking.
Files: next.config.ts, app/middleware.ts
Done when: Strict CSP with nonce; other headers set.

Claude Code prompt:

Set headers:

- CSP with script-src 'self' 'nonce-<generated>' https://accounts.google.com; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests.
- Add X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal.
- Implement nonce injection per request; attach to script tags.

Acceptance: CSP in response; app works with nonce; no inline script violations.

9.2 Abuse filters (NSFW/basic)

Why: Platform hygiene.
Files: server upload pipeline
Done when: Basic content scan toggleable.

Claude Code prompt:

Add optional basic image moderation:

- Integrate a placeholder `moderateImage(buffer)` that returns SAFE|FLAGGED (mock for now).
- If FLAGGED, mark photo as `requiresReview`; hide from public until admin approves.
- Add admin-only review page.

Acceptance: Mock flags route images into review queue; non-admins can’t fetch flagged images.

Phase 10 — Performance & DX
10.1 Image & bundle budgets

Why: Keep it snappy.
Files: next.config.ts, scripts
Done when: Build fails if budgets exceeded.

Claude Code prompt:

Add performance budgets:

- Next build analysis; fail CI if main JS chunk > 200KB gzip.
- Enforce max image upload 10MB; server re-encodes to webp quality 75, responsive sizes.
- Add dynamic imports for globe heavy deps.

Acceptance: CI fails when budget breached with clear message.

10.2 Database indexes & query review

Why: Speed at scale.
Files: prisma schema + queries
Done when: No obvious N+1; critical queries indexed.

Claude Code prompt:

Audit Prisma queries for feed, profile, albums:

- Add `select`/`include` to avoid overfetching.
- Confirm indexes on (userId, createdAt), (albumId, createdAt), and FKs exist.
- Write a simple load test script (k6 or autocannon) hitting /feed and /api/albums with seeded data and report.

Acceptance: P50 < 150ms on dev with 10k activities seeded (simulated).

Phase 11 — Observability & ops
11.1 Error tracking + tracing

Why: See and fix issues fast.
Files: Sentry or OpenTelemetry init
Done when: Server/API errors captured with userId (where allowed).

Claude Code prompt:

Integrate Sentry:

- Init in server and client; DSN via env; sampleRate 0.2 by default.
- Add user context (id only) on authenticated requests.
- Wrap API handlers with error catcher that reports to Sentry.

Acceptance: Forced error shows in Sentry with route and requestId.

11.2 Backups & migrations policy

Why: Don’t lose data.
Files: ops/backup.md, scripts
Done when: Nightly pg_dump documented/automated; restore doc exists.

Claude Code prompt:

Document and script backups:

- Add `ops/backup.md` with pg_dump command and restore steps.
- Provide GitHub Action (cron) that triggers a server-side backup script (if infra allows) or prints manual steps.

Acceptance: Clear, tested restore procedure in docs.

Phase 12 — QA, accessibility, GDPR
12.1 Playwright end-to-end suite

Why: Protect core journeys.
Files: tests/e2e/\*
Done when: Flows: signup+verify, create album, upload photos, privacy checks, follow & friend, like/comment, offline upload queue (stubbed).

Claude Code prompt:

Add Playwright tests:

- Tag @smoke for signup/login/album CRUD.
- Mock email verification.
- Test that private album 403s to other user.

Acceptance: `pnpm test:e2e` green locally and in CI.

12.2 Accessibility pass

Why: Inclusive by default.
Files: UI components
Done when: Axe passes; keyboard nav and focus visible.

Claude Code prompt:

Run axe checks, fix issues:

- Ensure buttons have discernible text, labels for inputs, focus order correct, motion reduced when `prefers-reduced-motion`.
- Radix/Shadcn components use correct roles/aria.

Acceptance: Automated axe checks pass on key pages; manual tab-through works.

12.3 Data export & account deletion

Why: GDPR-friendly.
Files: APIs + job
Done when: Users can export JSON/ZIP of their data; can delete account (soft-delete then background purge).

Claude Code prompt:

Implement:

- GET /api/me/export -> bundles user, albums, photos (paths), comments, likes, relations as JSON; provide a time-limited download link.
- POST /api/me/delete -> marks account deletedAt and enqueues purge job that removes private content; blocks login.

Acceptance: Export file downloads; delete flow prevents further access and hides content.

Phase 13 — Docs & onboarding
13.1 Developer docs & runnable seed demo

Why: Faster contributors and testers.
Files: README.md, docs/ARCHITECTURE.md, prisma/seed.ts
Done when: One command boot with demo data; diagrams included.

Claude Code prompt:

Update README:

- Quickstart (pnpm i; set env; prisma migrate; seed; pnpm dev).
- Add docs/ARCHITECTURE.md with diagrams for auth, upload pipeline, feed.
- Include troubleshooting (Prisma, Node, SW).

Acceptance: New dev can run app in <10 mins following docs.

Bonus: UAT test checklist (paste in issue tracker)

Sign up (Google + Credentials + verify email)

Create album (privacy each type)

Upload 10 photos (airplane mode mid-upload)

Globe renders & 2D fallback

Follow + friend + view friends-only album

Like/comment; notification bell increments/decrements

Badge awarded on Nth photo

Export data; delete account behaviour
