# OAuth Configuration Guide for Adventure Log

## 🚨 Critical: Fix Google Cloud Console OAuth Configuration

The current OAuth redirect_uri_mismatch error is caused by missing production redirect URIs in your Google Cloud Console configuration.

### Required Configuration

#### 1. Google Cloud Console Setup

Visit: [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)

Find your OAuth 2.0 Client ID: `YOUR_GOOGLE_CLIENT_ID_HERE`

#### 2. Authorized JavaScript Origins

Add these origins:

```
http://localhost:3004
https://adventure-log-five.vercel.app
```

#### 3. Authorized Redirect URIs

Add these redirect URIs:

```
http://localhost:3004/api/auth/callback/google
https://adventure-log-five.vercel.app/api/auth/callback/google
```

### Environment Variables Configuration

#### Development (.env.local)

```env
NEXTAUTH_URL="http://localhost:3004"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3004/api"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
```

#### Production (Vercel Environment Variables)

```env
NEXTAUTH_URL="https://adventure-log-five.vercel.app"
NEXT_PUBLIC_API_BASE_URL="https://adventure-log-five.vercel.app/api"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"
```

### Vercel Environment Variables Setup

1. Go to [Vercel Dashboard > Adventure Log > Settings > Environment Variables](https://vercel.com/dashboard)
2. Add/Update these variables:

| Variable                   | Value                                                                      | Environment |
| -------------------------- | -------------------------------------------------------------------------- | ----------- |
| `NEXTAUTH_URL`             | `https://adventure-log-five.vercel.app`                                    | Production  |
| `NEXT_PUBLIC_API_BASE_URL` | `https://adventure-log-five.vercel.app/api`                                | Production  |
| `GOOGLE_CLIENT_ID`         | `YOUR_GOOGLE_CLIENT_ID_HERE` | All         |
| `GOOGLE_CLIENT_SECRET`     | `YOUR_GOOGLE_CLIENT_SECRET_HERE`                                      | All         |
| `NEXTAUTH_SECRET`          | `YOUR_NEXTAUTH_SECRET_HERE`                             | All         |

### Security Checklist

- [x] Environment variables are consistent across development and production
- [x] Vercel.json configured with proper OAuth rewrites
- [x] Middleware updated to protect all API routes
- [ ] Google Cloud Console redirect URIs updated (YOU MUST DO THIS)
- [ ] Vercel environment variables updated
- [ ] Test OAuth flow in production

### Testing OAuth After Configuration

1. **Development Testing:**

   ```bash
   npm run dev
   # Visit http://localhost:3004
   # Click "Sign in with Google"
   # Should redirect to Google OAuth, then back to your app
   ```

2. **Production Testing:**
   ```bash
   # Visit https://adventure-log-five.vercel.app
   # Click "Sign in with Google"
   # Should work without redirect_uri_mismatch error
   ```

### Common Issues & Solutions

#### Issue: "redirect_uri_mismatch"

**Solution:** Ensure Google Cloud Console has BOTH redirect URIs:

- `http://localhost:3004/api/auth/callback/google` (development)
- `https://adventure-log-five.vercel.app/api/auth/callback/google` (production)

#### Issue: "NEXTAUTH_URL mismatch"

**Solution:** Ensure NEXTAUTH_URL exactly matches your domain:

- Development: `http://localhost:3004`
- Production: `https://adventure-log-five.vercel.app`

#### Issue: "Invalid client"

**Solution:** Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct in both environments.

### Quick Fix Steps

1. **Immediate Fix (5 minutes):**
   - Add production redirect URI to Google Cloud Console
   - Update Vercel environment variables
   - Redeploy in Vercel

2. **Verification:**
   - Test development OAuth: http://localhost:3004
   - Test production OAuth: https://adventure-log-five.vercel.app
   - Both should work without errors

### Support

If you continue experiencing issues:

1. Check the Network tab in browser dev tools for exact error messages
2. Verify all URLs match exactly (no trailing slashes, correct protocols)
3. Ensure Google Cloud Console project is the correct one
4. Check Vercel deployment logs for any build-time errors

---

**CRITICAL:** You must update the Google Cloud Console redirect URIs immediately to fix the production OAuth error. The code changes are already complete and correct.
