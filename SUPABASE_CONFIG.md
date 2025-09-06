# Supabase Authentication Configuration

## Required Supabase Dashboard Settings

### 1. Site URL Configuration

Navigate to Authentication > Settings in Supabase Dashboard:

- **Site URL**: `https://adventure-log-five.vercel.app`

### 2. Redirect URLs Configuration

In Authentication > Settings > Redirect URLs, add both:

- **Production**: `https://adventure-log-five.vercel.app/auth/callback`
- **Development**: `http://localhost:3000/auth/callback`

### 3. Google OAuth Provider Setup

In Authentication > Providers > Google:

- Enable Google provider
- Add your Google OAuth credentials:
  - Client ID: (from Google Cloud Console)
  - Client Secret: (from Google Cloud Console)
- Authorized redirect URIs in Google Cloud Console should include:
  - `https://izjbtlpcpxlnndofudti.supabase.co/auth/v1/callback`

### 4. Storage Configuration

In Storage, ensure the `adventure-photos` bucket:

- Exists and is set to **Private** (not public)
- Has proper RLS policies configured (see storage-setup.sql)

### 5. Database Configuration

Ensure RLS is enabled on all tables and proper policies are in place for user data access.

## Environment Variables Verification

### Production (.env.vercel)

```
NEXT_PUBLIC_SUPABASE_URL="https://izjbtlpcpxlnndofudti.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Development (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL="https://izjbtlpcpxlnndofudti.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Critical Configuration Fixes Applied

1. ✅ Updated localhost port from 3004 to 3000 in .env.local
2. ✅ Verified production URLs point to adventure-log-five.vercel.app
3. 🔄 **ACTION REQUIRED**: Update Supabase Dashboard Site URL and Redirect URLs
4. 🔄 **ACTION REQUIRED**: Configure Google OAuth provider in Supabase Dashboard

## Next Steps

1. **Apply Supabase Dashboard Changes**: Update Site URL and Redirect URLs as specified above
2. **Configure Google OAuth**: Set up Google provider in Supabase Authentication settings
3. **Verify Storage Bucket**: Ensure adventure-photos bucket is private with proper RLS
4. **Test Authentication Flow**: Run comprehensive tests after configuration updates
