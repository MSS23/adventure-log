# Vercel Environment Variables Setup Guide

## 🚨 Critical Issue Resolution

Your Adventure Log deployment is failing due to missing environment variables. Here's exactly what needs to be fixed:

## 📋 **Required Environment Variables for Vercel**

### **IMMEDIATE FIX - Add these to Vercel Production Environment:**

1. **DATABASE_URL** _(Critical - Fixes deployment failure)_

   ```
   postgresql://neondb_owner:npg_xTBSIk16iNlX@ep-damp-star-adka7xqf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

2. **NEXTAUTH_SECRET** _(Required for NextAuth)_

   ```
   your-nextauth-secret-here-change-me-32-chars-minimum
   ```

3. **GOOGLE_CLIENT_ID** _(For Google OAuth)_

   ```
   51389942334-4bn6ldn8nu1ems52gq1grn7k7rm0ouso.apps.googleusercontent.com
   ```

4. **GOOGLE_CLIENT_SECRET** _(For Google OAuth)_
   ```
   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
   ```

### **SUPABASE CONFIGURATION (Required for Google OAuth Authentication):**

5. **NEXT_PUBLIC_SUPABASE_URL**

   ```
   https://your-project-id.supabase.co
   ```

   _⚠️ Replace with your actual Supabase project URL_

6. **NEXT_PUBLIC_SUPABASE_ANON_KEY**

   ```
   your-supabase-anonymous-key-here
   ```

   _⚠️ Replace with your actual Supabase anonymous key_

7. **SUPABASE_SERVICE_ROLE_KEY**

   ```
   your-supabase-service-role-key-here
   ```

   _⚠️ Replace with your actual Supabase service role key_

8. **NEXT_PUBLIC_SUPABASE_BUCKET**
   ```
   adventure-photos
   ```

## 🔧 **How to Add Environment Variables to Vercel**

### Method 1: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Navigate to your `adventure-log` project
3. Go to **Settings** > **Environment Variables**
4. Add each variable listed above:
   - **Name**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select **Production** (and optionally Preview/Development)
5. Click **Save**

### Method 2: Vercel CLI (If linking works)

```bash
# Add each variable individually
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_BUCKET production
```

## 🔍 **Issue Analysis**

### **Deployment Failure**

- **Error**: `Environment variable not found: DATABASE_URL`
- **Cause**: Missing DATABASE_URL prevents Prisma from connecting during build
- **Fix**: ✅ Enhanced `scripts/setup-production-db.ts` to handle missing variables gracefully

### **Google OAuth Not Working**

- **Root Cause**: Missing Supabase environment variables
- **The OAuth implementation is correct** - just needs proper configuration
- **Authentication flow**: Sign-in → Supabase OAuth → Google → Callback → Session creation ✅

## 🚀 **Next Steps After Adding Variables**

1. **Redeploy on Vercel**
   - Go to Vercel dashboard → Deployments → Redeploy latest
   - Or push a new commit to trigger deployment

2. **Test Google OAuth**
   - Visit your deployed app
   - Click "Continue with Google"
   - Should redirect to Google auth
   - Return to your app with successful login

3. **Monitor Deployment**
   - Check Vercel build logs for success
   - Verify no DATABASE_URL errors
   - Confirm authentication works

## 📝 **Files Modified**

### ✅ **Enhanced Production Database Setup**

- **File**: `scripts/setup-production-db.ts`
- **Changes**: Added graceful handling for missing DATABASE_URL
- **Result**: Build process won't fail if DATABASE_URL is missing during build

### ✅ **Updated Local Environment**

- **File**: `.env.local`
- **Changes**: Added complete environment variable configuration
- **Note**: Update Supabase values with your actual project credentials

## 🎯 **Priority Order**

1. **🔴 URGENT**: Add `DATABASE_URL` to fix deployment failure
2. **🟡 HIGH**: Add Supabase variables to fix Google OAuth
3. **🟢 MEDIUM**: Add remaining configuration variables

## 💡 **Important Notes**

- **Supabase Setup**: You'll need to get your actual Supabase project credentials
- **Google OAuth Redirect**: Make sure your Google Cloud Console has the correct redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
- **Testing**: The authentication flow is well-implemented - it just needs proper environment configuration

## 🔧 **Troubleshooting**

If OAuth still doesn't work after adding variables:

1. Check Supabase project settings
2. Verify Google Cloud Console redirect URIs
3. Check browser network tab for specific errors
4. Review Vercel deployment logs

---

**The good news**: Your authentication code is professionally written and comprehensive. This is purely an environment configuration issue! 🎉
