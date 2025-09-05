# OAuth Setup Guide for Adventure Log

> **⚠️ SECURITY NOTE**: This documentation contains example/masked credentials only. Never commit real secrets to version control. Keep your actual `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` secure and use them only in environment variables.

## Current OAuth Configuration Status ✅

**Status**: HEALTHY - All environment variables correctly configured  
**Last Verified**: Configuration validated and working

### Environment Variables Configured:

- ✅ `GOOGLE_CLIENT_ID`: `YOUR_PROJECT_ID-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- ✅ `GOOGLE_CLIENT_SECRET`: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx`
- ✅ `NEXTAUTH_URL`: `https://adventure-log-five.vercel.app`
- ✅ `NEXTAUTH_SECRET`: Configured (45 characters)

---

## Google Cloud Console Configuration

### Required Redirect URIs:

The following redirect URIs **MUST** be configured in Google Cloud Console:

**Production:**

```
https://adventure-log-five.vercel.app/api/auth/callback/google
```

**Local Development:**

```
http://localhost:3000/api/auth/callback/google
```

### Step-by-Step Google Cloud Console Setup:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select project ID: `YOUR_PROJECT_ID`

2. **Navigate to APIs & Services > Credentials**
   - Find OAuth 2.0 Client ID: `YOUR_PROJECT_ID-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

3. **Edit OAuth Client Configuration**
   - Click on the client ID name
   - Ensure **Authorized redirect URIs** contains:
     - `https://adventure-log-five.vercel.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`

4. **Required APIs (Enable if not already enabled)**
   - Google+ API (deprecated but may be required)
   - People API (recommended)
   - Google Identity API

5. **Save Configuration**
   - Click "Save" to apply changes
   - Changes may take a few minutes to propagate

---

## Testing OAuth Flow

### 1. Local Testing Script

```bash
node scripts/verify-oauth.js
```

### 2. Production Testing Endpoints

```bash
# Basic OAuth configuration
curl https://adventure-log-five.vercel.app/api/debug/oauth

# Enhanced OAuth verification
curl https://adventure-log-five.vercel.app/api/debug/oauth-verify
```

### 3. Manual Testing Steps

1. **Clear browser cache and cookies** for adventure-log-five.vercel.app
2. **Open incognito/private window**
3. **Navigate to**: https://adventure-log-five.vercel.app/auth/signin
4. **Click "Continue with Google"**
5. **Expected flow:**
   - Google account selection page appears
   - User selects account and grants permissions
   - **Redirects to**: https://adventure-log-five.vercel.app/dashboard
   - Dashboard loads with user session

---

## Troubleshooting Common Issues

### Error: "invalid_client"

- **Cause**: Client ID mismatch or not found
- **Solution**: Verify Client ID in both Vercel environment variables and Google Cloud Console

### Error: "redirect_uri_mismatch"

- **Cause**: Redirect URI not configured in Google Cloud Console
- **Solution**: Add exact redirect URI: `https://adventure-log-five.vercel.app/api/auth/callback/google`

### Error: "OAuthAccountNotLinked"

- **Status**: ✅ FIXED - NextAuth configuration updated to use PrismaAdapter properly

### Redirect to signin instead of dashboard

- **Cause**: Session not being created properly
- **Solution**: Check browser network tab for authentication errors

---

## Verification Checklist

- [ ] Google Cloud Console has correct redirect URIs
- [ ] Required APIs are enabled
- [ ] Vercel environment variables are deployed
- [ ] Test OAuth flow in incognito window
- [ ] Verify dashboard redirect works
- [ ] Check user session is created properly

---

## Environment Variables Summary

### Vercel Production Environment

```bash
GOOGLE_CLIENT_ID="YOUR_PROJECT_ID-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx"
NEXTAUTH_URL="https://your-app-name.vercel.app"
NEXTAUTH_SECRET="your-secure-nextauth-secret-here"
```

### Local Development (.env.local)

```bash
GOOGLE_CLIENT_ID="YOUR_PROJECT_ID-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-nextauth-secret-here"
```

---

## Contact & Support

**Debug Endpoints:**

- OAuth Config: https://adventure-log-five.vercel.app/api/debug/oauth
- OAuth Verification: https://adventure-log-five.vercel.app/api/debug/oauth-verify

**Local Verification:**

- Run: `node scripts/verify-oauth.js`

---

_Last Updated: 2025-09-02 - OAuth Configuration Status: HEALTHY_
