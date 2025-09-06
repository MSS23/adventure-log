# Deployment Checklist: OAuth + Image Upload Fix

## ✅ Code Changes Completed

### Authentication Migration

- ✅ Updated `app/providers.tsx` to use Supabase auth instead of NextAuth
- ✅ Created `lib/supabase/client.ts` and `lib/supabase/server.ts` with proper session handling
- ✅ Updated middleware to use Supabase sessions
- ✅ Migrated photo upload component to use Supabase auth

### Storage & Upload Implementation

- ✅ Created `supabase-storage-setup.sql` with private bucket and RLS policies
- ✅ Created secure upload API at `/api/albums/[albumId]/photos/secure-upload`
- ✅ Updated photo upload component to use secure endpoint
- ✅ Implemented user-specific folder structure (`{userId}/{filename}`)

### Environment Configuration

- ✅ Updated `.env.local` to use localhost:3000 instead of 3004
- ✅ Verified Supabase configuration in both `.env.local` and `.env.vercel`
- ✅ Started dev server on port 3000: http://localhost:3000

### Diagnostics & Testing

- ✅ Created comprehensive auth debug panel at `/debug/supabase-auth`
- ✅ Created API test endpoint at `/api/debug/auth-test`

## 🔄 Manual Configuration Required

### 1. Supabase Dashboard Settings

**URL:** https://supabase.com/dashboard/project/izjbtlpcpxlnndofudti

#### A. Authentication Settings

Navigate to **Authentication > Settings**:

- **Site URL**: Change to `https://adventure-log-five.vercel.app`
- **Redirect URLs**: Add both:
  - `https://adventure-log-five.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

#### B. Google OAuth Provider

Navigate to **Authentication > Providers > Google**:

- ✅ Enable Google provider
- Add your Google OAuth credentials (if not already configured)
- Ensure Google Cloud Console has redirect URI:
  `https://izjbtlpcpxlnndofudti.supabase.co/auth/v1/callback`

#### C. Storage Setup

Navigate to **Storage**:

- Run the SQL from `supabase-storage-setup.sql` in the SQL Editor
- Verify `adventure-photos` bucket exists and is private
- Confirm RLS policies are active

### 2. Vercel Environment Variables

**URL:** https://vercel.com/dashboard (your deployment)

#### Required Environment Variables

```bash
# Already configured - verify these exist:
NEXT_PUBLIC_SUPABASE_URL=https://izjbtlpcpxlnndofudti.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_BUCKET=adventure-photos
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URLs (already configured)
DATABASE_URL=postgresql://neondb_owner:npg_xTBSIk16iNlX@...
POSTGRES_URL=postgresql://neondb_owner:npg_xTBSIk16iNlX@...
```

### 3. Google Cloud Console

**URL:** https://console.cloud.google.com/apis/credentials

#### OAuth 2.0 Client ID Configuration

Ensure **Authorized redirect URIs** includes:

- `https://izjbtlpcpxlnndofudti.supabase.co/auth/v1/callback`

## 🧪 Testing Protocol

### Phase 1: Local Development Testing

1. **Start Dev Server**: `npm run dev -- --port 3000`
2. **Open Debug Panel**: http://localhost:3000/debug/supabase-auth
3. **Test Auth Flow**:
   - Click "Sign In with Google"
   - Verify successful redirect to `/auth/callback`
   - Check that session persists across page reloads
4. **Test Album Access**: http://localhost:3000/albums
5. **Test File Upload**: Navigate to any album and try uploading images

### Phase 2: Production Testing

1. **Deploy to Vercel**: Push changes and deploy
2. **Open Debug Panel**: https://adventure-log-five.vercel.app/debug/supabase-auth
3. **Test Production Auth Flow**:
   - Google OAuth with production redirect
   - Session persistence across server components
   - API authentication
4. **Test Production Upload**: Upload images in production environment

### Phase 3: Comprehensive Validation

1. **Database Verification**:
   - Check `photos` table has RLS policies
   - Verify user data isolation
   - Test signed URL generation
2. **Storage Verification**:
   - Confirm private bucket setup
   - Test user-specific folder creation
   - Validate RLS policy enforcement
3. **Cross-Browser Testing**: Test in Chrome, Firefox, Safari

## 🚨 Critical Success Criteria

### Authentication Must Work

- [ ] Google OAuth login successful
- [ ] Session persists across page refreshes
- [ ] Protected routes accessible after login
- [ ] API routes recognize authenticated user
- [ ] Logout clears session completely

### File Upload Must Work

- [ ] Users can select and upload image files
- [ ] Files stored in user-specific folders (`{userId}/filename`)
- [ ] Signed URLs generated for private file access
- [ ] Database records created in `photos` table
- [ ] RLS policies prevent cross-user access

### No More 401/403 Errors

- [ ] Album pages load for authenticated users
- [ ] Upload requests succeed with proper auth
- [ ] API responses include user context
- [ ] Storage operations authorized correctly

## 🔍 Debug Resources

- **Local Auth Debug**: http://localhost:3000/debug/supabase-auth
- **Production Auth Debug**: https://adventure-log-five.vercel.app/debug/supabase-auth
- **Supabase Logs**: https://supabase.com/dashboard/project/izjbtlpcpxlnndofudti/logs
- **Vercel Function Logs**: Vercel Dashboard > Functions tab

## 🎯 Next Steps

1. **Apply Supabase Dashboard Configuration** (Site URL, Redirect URLs, Storage SQL)
2. **Verify Vercel Environment Variables**
3. **Test Local Development Flow** (http://localhost:3000)
4. **Deploy and Test Production**
5. **Run Acceptance Tests** using debug panel

Once these manual configuration steps are completed, your OAuth + image upload flow should be fully functional without authentication errors.
