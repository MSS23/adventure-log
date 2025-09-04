# Adventure Log Upload Troubleshooting Guide

## 🚨 Upload Issues - Complete Diagnostic & Fix Guide

This guide helps diagnose and fix photo upload issues in the Adventure Log application. Follow these steps systematically to identify and resolve upload problems.

---

## 🔍 Quick Diagnosis Checklist

Before diving into detailed fixes, run through this quick checklist:

- [ ] **Authentication**: Can you sign in successfully?
- [ ] **Album Access**: Can you create and edit albums?
- [ ] **Network**: Are you connected to the internet?
- [ ] **Browser Console**: Any JavaScript errors when uploading?
- [ ] **File Types**: Are you uploading valid image files (JPG, PNG, GIF, WebP)?
- [ ] **File Size**: Are files under 10MB?

---

## 🏗️ Infrastructure Issues (Most Common)

### 1. **Supabase Configuration Issues** ⚡ **HIGH PRIORITY**

#### 1.1 Storage Bucket Setup

**Problem**: Bucket doesn't exist or has wrong permissions
**Symptoms**: "Bucket not found" or "Access denied" errors

**Fix Steps**:

1. **Login to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Storage**: Left sidebar → Storage
3. **Verify Bucket Exists**:
   ```
   Bucket Name: adventure-photos
   Status: Public ✅
   ```
4. **Create Bucket if Missing**:
   ```sql
   -- Run in SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('adventure-photos', 'adventure-photos', true);
   ```

#### 1.2 Row Level Security (RLS) Policies ⚠️ **CRITICAL**

**Problem**: Most common upload failure cause - missing RLS policies
**Symptoms**: Uploads fail silently or return "Unauthorized" errors

**Required Policies** (Run in Supabase SQL Editor):

```sql
-- 1. Allow Service Role to INSERT files
CREATE POLICY "Service role can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'service_role'
);

-- 2. Allow Service Role to SELECT files
CREATE POLICY "Service role can read files" ON storage.objects
FOR SELECT USING (
  auth.role() = 'service_role'
);

-- 3. Allow Service Role to UPDATE files
CREATE POLICY "Service role can update files" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'service_role'
);

-- 4. Allow Service Role to DELETE files
CREATE POLICY "Service role can delete files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'service_role'
);

-- 5. Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

#### 1.3 CORS Configuration

**Problem**: Browser blocks uploads due to CORS policy
**Symptoms**: CORS errors in browser console

**Fix**:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
1. Go to **Supabase Dashboard** → **Settings** → **Storage**
2. **Add CORS Policy**:
   ```json
   {
     "allowedOrigins": [
       "http://localhost:3001",
       "https://your-app-domain.vercel.app",
       "https://adventure-log-five.vercel.app"
     ],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "maxAge": 3600
   }
   ```

#### 1.4 Service Role Permissions

**Problem**: Service role key lacks storage permissions
**Symptoms**: "Insufficient permissions" errors

**Verification**:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
1. **Dashboard** → **Settings** → **API**
2. **Copy Service Role Key** (not Anon key!)
3. **Test with curl**:
   ```bash
   curl -X POST 'https://your-project.supabase.co/storage/v1/object/adventure-photos/test.txt' \
   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
   -H 'Content-Type: text/plain' \
   -d 'test content'
   ```

### 2. **Neon Database Issues** 🗄️

#### 2.1 Connection Pool Exhaustion

**Problem**: Database connections timing out during uploads
**Symptoms**: "Connection pool exhausted" or timeout errors

**Fix**:
<<<<<<< HEAD
1. **Optimize Connection String**:
=======

1. **Optimize Connection String**:

>>>>>>> oauth-upload-fixes
   ```
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pool_timeout=20&connection_limit=10"
   ```

2. **Add Database Indexes** (Run in Neon Console):
<<<<<<< HEAD
   ```sql
   -- Optimize album photo queries
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_album_photos_album_id 
   ON "AlbumPhoto" ("albumId", "createdAt" DESC);
   
   -- Optimize user photo count updates
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_photo_count 
   ON "User" ("id", "totalPhotosCount");
   
   -- Optimize album cover photo queries
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_albums_cover_photo 
=======

   ```sql
   -- Optimize album photo queries
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_album_photos_album_id
   ON "AlbumPhoto" ("albumId", "createdAt" DESC);

   -- Optimize user photo count updates
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_photo_count
   ON "User" ("id", "totalPhotosCount");

   -- Optimize album cover photo queries
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_albums_cover_photo
>>>>>>> oauth-upload-fixes
   ON "Album" ("id", "coverPhotoId");
   ```

#### 2.2 Query Timeout Issues

**Problem**: Database operations taking too long
**Symptoms**: 504 Gateway Timeout errors

**Fix**:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
```sql
-- Increase statement timeout (run in Neon)
SET statement_timeout = '30s';
SET lock_timeout = '10s';
```

---

## 🔧 Code-Level Issues

### 3. **Authentication & Session Problems**

#### 3.1 NextAuth Session Issues

**Problem**: User session not persisting or invalid
**Symptoms**: "Unauthorized" errors despite being logged in

**Debug Steps**:
<<<<<<< HEAD
1. **Check Session in Browser Console**:
   ```javascript
   // Run in browser console on your app
   fetch('/api/auth/session').then(r => r.json()).then(console.log)
=======

1. **Check Session in Browser Console**:

   ```javascript
   // Run in browser console on your app
   fetch("/api/auth/session")
     .then((r) => r.json())
     .then(console.log);
>>>>>>> oauth-upload-fixes
   ```

2. **Verify Session in Upload API**:
   - Add logging to `/api/photos/upload/route.ts`
   - Check if `session.user.id` exists

**Fix**: Update NextAuth configuration:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
```typescript
// lib/auth.ts - Add session strategy
export const authOptions: NextAuthOptions = {
  // ... existing config
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
<<<<<<< HEAD
}
=======
};
>>>>>>> oauth-upload-fixes
```

#### 3.2 Album Ownership Verification

**Problem**: User can't upload to albums they don't own
**Symptoms**: "Album not found" errors

**Debug Query**:
<<<<<<< HEAD
```sql
-- Check album ownership in Neon Console
SELECT a.id, a.title, a.userId, u.email 
FROM "Album" a 
JOIN "User" u ON a.userId = u.id 
=======

```sql
-- Check album ownership in Neon Console
SELECT a.id, a.title, a.userId, u.email
FROM "Album" a
JOIN "User" u ON a.userId = u.id
>>>>>>> oauth-upload-fixes
WHERE a.id = 'your-album-id';
```

### 4. **File Validation Issues**

#### 4.1 File Size Limits

**Current Limits**:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- Client-side: 10MB per file
- Server-side: 10MB per file
- Supabase: 50MB per file (default)

**Fix Mismatched Limits**:
<<<<<<< HEAD
```typescript
// lib/upload.ts - Increase client limit to match server
if (file.size > 50 * 1024 * 1024) { // 50MB
=======

```typescript
// lib/upload.ts - Increase client limit to match server
if (file.size > 50 * 1024 * 1024) {
  // 50MB
>>>>>>> oauth-upload-fixes
  return "File size must be less than 50MB";
}
```

#### 4.2 MIME Type Validation

**Problem**: Some image types not accepted
**Fix**: Expand accepted types:
<<<<<<< HEAD
```typescript
// lib/upload.ts
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff'
=======

```typescript
// lib/upload.ts
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
>>>>>>> oauth-upload-fixes
];

if (!ACCEPTED_TYPES.includes(file.type)) {
  return "File type not supported";
}
```

---

## 🛠️ Debugging Tools & Scripts

### 5. **Environment Verification Script**

Create and run this script to verify your setup:

```bash
#!/bin/bash
# verify-upload-config.sh

echo "🔍 Verifying Adventure Log Upload Configuration..."

# Check environment variables
echo "📋 Environment Variables:"
if [ -n "$DATABASE_URL" ]; then echo "✅ DATABASE_URL: Set"; else echo "❌ DATABASE_URL: Missing"; fi
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then echo "✅ SUPABASE_URL: Set"; else echo "❌ SUPABASE_URL: Missing"; fi
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then echo "✅ SERVICE_ROLE_KEY: Set"; else echo "❌ SERVICE_ROLE_KEY: Missing"; fi
if [ -n "$NEXT_PUBLIC_SUPABASE_BUCKET" ]; then echo "✅ BUCKET_NAME: Set"; else echo "❌ BUCKET_NAME: Missing"; fi

echo ""
echo "🧪 Testing Supabase Connection..."
# Test Supabase storage access
curl -s -I "https://${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket/adventure-photos" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | head -1

echo ""
echo "💾 Testing Database Connection..."
# Test database connection (requires psql)
if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" -c "SELECT COUNT(*) as user_count FROM \"User\";" 2>/dev/null || echo "❌ Database connection failed"
else
  echo "⚠️  psql not available - install PostgreSQL client to test DB connection"
fi
```

### 6. **Upload Test API Endpoint**

Add this test endpoint to debug upload issues:

```typescript
// app/api/debug/upload-test/route.ts
<<<<<<< HEAD
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
=======
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
>>>>>>> oauth-upload-fixes

export async function POST() {
  try {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
<<<<<<< HEAD
    
    // Test 1: List buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    // Test 2: Upload test file
    const testFile = 'test-upload-' + Date.now() + '.txt';
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName!)
      .upload(`test/${testFile}`, 'Test upload content', {
        contentType: 'text/plain'
      });
    
    // Test 3: Clean up
    await supabaseAdmin.storage.from(bucketName!).remove([`test/${testFile}`]);
    
    return NextResponse.json({
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
      bucketsError,
      uploadError,
      status: uploadError ? 'FAILED' : 'SUCCESS'
    });
    
=======

    // Test 1: List buckets
    const { data: buckets, error: bucketsError } =
      await supabaseAdmin.storage.listBuckets();

    // Test 2: Upload test file
    const testFile = "test-upload-" + Date.now() + ".txt";
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName!)
      .upload(`test/${testFile}`, "Test upload content", {
        contentType: "text/plain",
      });

    // Test 3: Clean up
    await supabaseAdmin.storage.from(bucketName!).remove([`test/${testFile}`]);

    return NextResponse.json({
      buckets: buckets?.map((b) => ({ name: b.name, public: b.public })),
      bucketsError,
      uploadError,
      status: uploadError ? "FAILED" : "SUCCESS",
    });
>>>>>>> oauth-upload-fixes
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Access at: `http://localhost:3001/api/debug/upload-test`

---

## 🚀 Step-by-Step Resolution Process

### Phase 1: Infrastructure Verification (30 minutes)

1. **✅ Verify Supabase Setup**:
   - [ ] Login to Supabase Dashboard
   - [ ] Confirm bucket exists and is public
   - [ ] Run RLS policy SQL scripts
   - [ ] Test service role key with curl

2. **✅ Verify Neon Database**:
   - [ ] Login to Neon Console
   - [ ] Run performance optimization queries
   - [ ] Check connection string format

### Phase 2: Code Debugging (45 minutes)

3. **✅ Enable Debug Mode**:
   - [ ] Add upload test API endpoint
   - [ ] Enable verbose logging in upload API
   - [ ] Test with browser network tab open

4. **✅ Test Authentication**:
   - [ ] Verify NextAuth session works
   - [ ] Check album ownership queries
   - [ ] Test API endpoints with Postman/curl

### Phase 3: End-to-End Testing (15 minutes)

5. **✅ Upload Test**:
   - [ ] Create test album
   - [ ] Upload small image (< 1MB)
   - [ ] Upload larger image (5MB)
   - [ ] Check database records
   - [ ] Verify file accessibility

---

## 🆘 Emergency Fixes

### Quick Fix #1: Reset Supabase Bucket
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
```sql
-- Reset bucket policies (DANGER: This removes all policies)
DROP POLICY IF EXISTS "Service role can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete files" ON storage.objects;

-- Recreate with correct policies (see section 1.2 above)
```

### Quick Fix #2: Database Connection Reset
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
```bash
# Reset Neon connection pool
curl -X POST https://console.neon.tech/api/v2/projects/YOUR_PROJECT_ID/restart \
  -H "Authorization: Bearer YOUR_NEON_API_KEY"
```

### Quick Fix #3: Clear Upload Cache
<<<<<<< HEAD
```typescript
// Add to upload API for debugging
await supabaseAdmin.storage.from(bucketName).remove(['*']); // ⚠️ DANGER: Removes all files
=======

```typescript
// Add to upload API for debugging
await supabaseAdmin.storage.from(bucketName).remove(["*"]); // ⚠️ DANGER: Removes all files
>>>>>>> oauth-upload-fixes
```

---

## 📞 Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Neon Support**: https://neon.tech/docs/support
- **NextAuth Issues**: https://github.com/nextauthjs/next-auth/discussions

---

## 🔄 Regular Maintenance

### Weekly Checks:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- [ ] Monitor storage usage in Supabase
- [ ] Check database connection pool metrics in Neon
- [ ] Review error logs for upload failures
- [ ] Test upload functionality across different browsers

### Monthly Optimization:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- [ ] Analyze slow query logs in Neon
- [ ] Review and update RLS policies if needed
- [ ] Check for unused storage files
- [ ] Update dependencies and security patches

---

<<<<<<< HEAD
*Last Updated: December 2024*  
*Adventure Log - Photo Upload Troubleshooting Guide*
=======
_Last Updated: December 2024_  
_Adventure Log - Photo Upload Troubleshooting Guide_
>>>>>>> oauth-upload-fixes
