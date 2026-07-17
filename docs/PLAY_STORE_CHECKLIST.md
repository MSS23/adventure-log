# Google Play release checklist

- Build a signed AAB with `npm run mobile:aab`; retain its SHA-256.
- Increment both semantic version and Android `versionCode` with
  `npm run release:version -- --version=X.Y.Z --code=N`.
- Upload to internal testing first and verify clean install plus upgrade.
- Test email/password and Google OAuth, 25 cold starts, access-token refresh,
  app background/foreground, account switching, camera/gallery upload,
  location denial/approval, offline/reconnect, and deep links.
- Complete Data Safety for account/profile data, user photos, approximate and
  precise location, social content, diagnostics, and optional analytics.
- Link the privacy policy and web account-deletion instructions in Play Console.
- Complete content rating, target-audience/age declarations, ads declaration,
  and the user-generated-content moderation declaration.
- Confirm `MODERATION_REQUIRED=true` with a working provider for public launch.
- Confirm Sentry crash/ANR monitoring and alert ownership.
- Roll through internal, closed, then production tracks; do not promote a build
  whose web `Release Gate`, security, or Lighthouse checks are failing.
