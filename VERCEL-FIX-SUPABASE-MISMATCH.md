# 🚨 URGENT: Fix Vercel-Supabase Project Mismatch

## **Problem Identified**

You have **two different Supabase projects**:

| Environment | Supabase URL                               | Project ID             | Status                                   |
| ----------- | ------------------------------------------ | ---------------------- | ---------------------------------------- |
| **Local**   | `https://kbdkfukqryxkgfnqttiy.supabase.co` | `kbdkfukqryxkgfnqttiy` | ✅ Working (has adventure-photos bucket) |
| **Vercel**  | `https://izjbtlpcpxlnndofudti.supabase.co` | `izjbtlpcpxlnndofudti` | ❌ Different project (missing bucket)    |

**This is why photo uploads fail in production!** 🔥

## **Solution: Switch Vercel to Local Supabase Project**

### **Step 1: Update Vercel Environment Variables**

Go to: [Vercel Environment Variables](https://vercel.com/mss23s-projects/~/settings/environment-variables)

**Replace these Supabase variables:**

| Variable                        | OLD Value (Vercel)                                                                                                                                                                                                            | NEW Value (Local)                                                                                                                                                                                                             | Environment |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://izjbtlpcpxlnndofudti.supabase.co`                                                                                                                                                                                    | `https://kbdkfukqryxkgfnqttiy.supabase.co`                                                                                                                                                                                    | All         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTE0NjMsImV4cCI6MjA2ODI2NzQ2M30.hCJkEvz271RnyQcBULTFIZSD54c-qQas2dYQjWX3LwQ`            | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjkzODQsImV4cCI6MjA2ODYwNTM4NH0.Us4DYgZRuiSvK99XnBx0i5hEkemIAFY9t_hlDiMMmBc`            | All         |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY5MTQ2MywiZXhwIjoyMDY4MjY3NDYzfQ.NeC40E1TIMw4aQ0eAZLa8ocO1Kk_g-fDGJ0wb540AgE` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAyOTM4NCwiZXhwIjoyMDY4NjA1Mzg0fQ.k6OwSGxmNcoBKwZzVosqDoHujTDmeSXwCQLrzOWKipA` | All         |

**Add this new variable:**

| Variable                      | Value              | Environment |
| ----------------------------- | ------------------ | ----------- |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | `adventure-photos` | All         |

### **Step 2: Keep Existing Database Variables**

**DO NOT CHANGE** these (keep your existing Neon DB):

- ✅ `DATABASE_URL` (your Neon PostgreSQL)
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`

### **Step 3: Clean Up Old Supabase Variables**

**Remove these old Supabase database variables** (not needed with Neon):

- ❌ `POSTGRES_URL`
- ❌ `POSTGRES_USER`
- ❌ `POSTGRES_HOST`
- ❌ `POSTGRES_PASSWORD`
- ❌ `POSTGRES_DATABASE`
- ❌ `POSTGRES_PRISMA_URL`
- ❌ `POSTGRES_URL_NON_POOLING`
- ❌ `SUPABASE_JWT_SECRET`

### **Step 4: Final Vercel Environment Variables**

Your Vercel environment should have:

```bash
# Database (Neon - keep existing)
DATABASE_URL="postgresql://neondb_owner:npg_JsEPzMf9l0vk@ep-old-truth-aeka7114-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth (keep existing)
NEXTAUTH_SECRET="your-existing-secret"
NEXTAUTH_URL="https://your-app.vercel.app"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase Storage (NEW - from local)
NEXT_PUBLIC_SUPABASE_URL="https://kbdkfukqryxkgfnqttiy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjkzODQsImV4cCI6MjA2ODYwNTM4NH0.Us4DYgZRuiSvK99XnBx0i5hEkemIAFY9t_hlDiMMmBc"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAyOTM4NCwiZXhwIjoyMDY4NjA1Mzg0fQ.k6OwSGxmNcoBKwZzVosqDoHujTDmeSXwCQLrzOWKipA"
NEXT_PUBLIC_SUPABASE_BUCKET="adventure-photos"
```

## **Step 5: Verify & Deploy**

1. **Save environment variables** in Vercel dashboard
2. **Redeploy** your application (any push to main branch)
3. **Test storage connection**: `https://your-app.vercel.app/api/debug/storage-test`
4. **Test photo upload** in production

## **Architecture After Fix**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Neon Database  │    │Supabase Storage │
│   (Vercel)     │────│  (PostgreSQL)   │    │ (kbdkfukqryx...) │
│                │    │                 │    │                │
│  - User Auth   │    │  - User data    │    │  - Photo files │
│  - Albums UI   │────│  - Album data   │    │  - adventure-   │
│  - Photo Upload│    │  - Metadata     │    │    photos bucket│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## **What This Fixes**

- ✅ **Photo uploads** will work in production
- ✅ **Photo display** will work (correct URLs)
- ✅ **Storage bucket** exists and is configured
- ✅ **Local and production** use same storage
- ✅ **Database remains** on Neon (unchanged)

## **Verification Commands**

After deployment, test:

```bash
# Local verification (should still work)
npm run storage:verify

# Production test
curl https://your-app.vercel.app/api/debug/storage-test
```

## **Emergency Rollback**

If something goes wrong, you can rollback by changing the Supabase variables back to:

- URL: `https://izjbtlpcpxlnndofudti.supabase.co`
- Keys: From your current Vercel setup

But this will still have the original photo upload issue.

---

## **Summary**

🎯 **Root Cause**: Vercel uses different Supabase project than local
🛠️ **Solution**: Point Vercel to use local Supabase project for storage
⏱️ **Time to Fix**: ~5 minutes to update environment variables
🚀 **Result**: Photo uploads work in production!
