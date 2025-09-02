# OAuth Setup Guide for Adventure Log

## Current OAuth Configuration Status ✅

**Status**: HEALTHY - All environment variables correctly configured  
**Last Verified**: 2025-09-02T11:57:07.374Z

### Environment Variables Configured:
- ✅ `GOOGLE_CLIENT_ID`: `51389942334-d2fqket01a6uil2ojf69c54nvkqre09f.apps.googleusercontent.com`
- ✅ `GOOGLE_CLIENT_SECRET`: `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`
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
   - Select project ID: `51389942334`

2. **Navigate to APIs & Services > Credentials**
   - Find OAuth 2.0 Client ID: `51389942334-d2fqket01a6uil2ojf69c54nvkqre09f.apps.googleusercontent.com`

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
GOOGLE_CLIENT_ID="51389942334-d2fqket01a6uil2ojf69c54nvkqre09f.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
NEXTAUTH_URL="https://adventure-log-five.vercel.app"
NEXTAUTH_SECRET="rujdiAAUi8Q1QaByxjOs9AUdYcCTEB5dHmISkmOQIW4="
```

### Local Development (.env.local)
```bash
GOOGLE_CLIENT_ID="51389942334-d2fqket01a6uil2ojf69c54nvkqre09f.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="rujdiAAUi8Q1QaByxjOs9AUdYcCTEB5dHmISkmOQIW4="
```

---

## Contact & Support

**Debug Endpoints:**
- OAuth Config: https://adventure-log-five.vercel.app/api/debug/oauth
- OAuth Verification: https://adventure-log-five.vercel.app/api/debug/oauth-verify

**Local Verification:**
- Run: `node scripts/verify-oauth.js`

---

*Last Updated: 2025-09-02 - OAuth Configuration Status: HEALTHY*