# Vercel-Supabase Connection Setup Guide

## Problem Diagnosis

Your Adventure Log app uses a **hybrid architecture**:

- **Neon PostgreSQL** → User accounts, albums, metadata, authentication
- **Supabase Storage** → Photo file storage only (not database)

If Vercel has a different Supabase connection, photo uploads will fail because the storage bucket doesn't match your local environment.

## Solution: Align Vercel with Local Supabase

### Step 1: Verify Local Configuration ✅

Your local environment is working correctly:

- ✅ Supabase URL: `https://kbdkfukqryxkgfnqttiy.supabase.co`
- ✅ Storage Bucket: `adventure-photos`
- ✅ Upload/Download: Working properly

### Step 2: Update Vercel Environment Variables

1. **Go to Vercel Dashboard:**

   ```
   https://vercel.com/[your-username]/[your-project]/settings/environment-variables
   ```

2. **Add/Update these environment variables:**

   | Variable                        | Value                                                                                                                                                                                                                         | Environment                      |
   | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | `https://kbdkfukqryxkgfnqttiy.supabase.co`                                                                                                                                                                                    | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjkzODQsImV4cCI6MjA2ODYwNTM4NH0.Us4DYgZRuiSvK99XnBx0i5hEkemIAFY9t_hlDiMMmBc`            | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAyOTM4NCwiZXhwIjoyMDY4NjA1Mzg0fQ.k6OwSGxmNcoBKwZzVosqDoHujTDmeSXwCQLrzOWKipA` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_BUCKET`   | `adventure-photos`                                                                                                                                                                                                            | Production, Preview, Development |

3. **Keep your existing Vercel environment variables:**
   - ✅ `DATABASE_URL` (your Neon DB URL)
   - ✅ `NEXTAUTH_SECRET`
   - ✅ `NEXTAUTH_URL` (your production URL)
   - ✅ `GOOGLE_CLIENT_ID`
   - ✅ `GOOGLE_CLIENT_SECRET`

### Step 3: Configure Supabase Storage Policies

1. **Go to Supabase Dashboard:**

   ```
   https://supabase.com/dashboard/project/kbdkfukqryxkgfnqttiy/storage/policies
   ```

2. **Create these storage policies:**

   **Policy 1: Allow public read access**
   - Name: `Adventure Log - Public Read`
   - Table: `objects`
   - Operation: `SELECT`
   - Policy: `bucket_id = 'adventure-photos'`

   **Policy 2: Allow authenticated upload**
   - Name: `Adventure Log - Authenticated Upload`
   - Table: `objects`
   - Operation: `INSERT`
   - Policy: `bucket_id = 'adventure-photos' AND auth.role() = 'authenticated'`

   **Policy 3: Allow authenticated update**
   - Name: `Adventure Log - Authenticated Update`
   - Table: `objects`
   - Operation: `UPDATE`
   - Policy: `bucket_id = 'adventure-photos' AND auth.role() = 'authenticated'`

   **Policy 4: Allow authenticated delete (optional)**
   - Name: `Adventure Log - Authenticated Delete`
   - Table: `objects`
   - Operation: `DELETE`
   - Policy: `bucket_id = 'adventure-photos' AND auth.role() = 'authenticated'`

### Step 4: Verify Bucket Configuration

1. **Go to Storage Buckets:**

   ```
   https://supabase.com/dashboard/project/kbdkfukqryxkgfnqttiy/storage/buckets
   ```

2. **Verify `adventure-photos` bucket settings:**
   - ✅ **Public**: Yes (enabled)
   - ✅ **File size limit**: 25MB
   - ✅ **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/heic, image/heif`

### Step 5: Deploy and Test

1. **Redeploy your Vercel application:**
   - Any push to your main branch will trigger deployment
   - Or manually redeploy from Vercel dashboard

2. **Test photo upload functionality:**
   - Create a test album
   - Try uploading a photo
   - Verify photo displays correctly

## Verification Commands

Run these locally to test your configuration:

```bash
# Verify storage configuration
npm run storage:verify

# Setup storage (if needed)
npm run storage:setup
```

## Troubleshooting

### Common Issues:

1. **"Bucket not found" errors:**
   - Check if Vercel environment variables match exactly
   - Verify bucket exists in correct Supabase project

2. **"Authentication required" errors:**
   - Check SUPABASE_SERVICE_ROLE_KEY is correct
   - Verify NextAuth session is working

3. **"Policy violation" errors:**
   - Ensure storage policies are created correctly
   - Check policy expressions match exactly

4. **"File not accessible" errors:**
   - Verify bucket is public
   - Check if public read policy exists

### Debug API Route:

Your app has a debug endpoint to test connections:

```
GET /api/debug/storage-test
```

## Architecture Summary

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Neon Database  │    │ Supabase Storage│
│  (Vercel)      │────│  (PostgreSQL)   │    │  (Files Only)  │
│                │    │                 │    │                │
│  - User Auth   │    │  - User data    │    │  - Photo files │
│  - Albums UI   │────│  - Album data   │    │  - Public URLs │
│  - Photo Upload│    │  - Metadata     │    │                │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Files Created

- ✅ `scripts/verify-supabase-storage.ts` - Verification script
- ✅ `scripts/setup-supabase-storage.ts` - Setup script
- ✅ `.env.vercel.template` - Environment template
- ✅ `VERCEL-SUPABASE-SETUP.md` - This guide

## Quick Checklist

- [ ] Update Vercel environment variables
- [ ] Configure Supabase storage policies
- [ ] Verify bucket is public
- [ ] Redeploy application
- [ ] Test photo upload in production
- [ ] Run `npm run storage:verify` locally to confirm
