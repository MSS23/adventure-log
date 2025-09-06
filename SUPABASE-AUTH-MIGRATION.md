# 🔄 NextAuth → Supabase Auth Migration Guide

This guide explains the complete migration from NextAuth to Supabase Auth for your Adventure Log application.

## 🎯 **What Was Created**

### **1. New Supabase Client Architecture**

#### **`lib/supabase/client.ts`** - Browser Client
- ✅ Singleton pattern to prevent multiple clients
- ✅ Cookie-based session persistence
- ✅ Automatic token refresh
- ✅ Helper functions for auth, storage, and database operations
- ✅ Error handling utilities

#### **`lib/supabase/server.ts`** - Server Client  
- ✅ Server Components and API routes support
- ✅ Cookie-based session management for App Router
- ✅ Service role client for admin operations
- ✅ Cached session/user functions to prevent multiple calls
- ✅ Authentication helpers and database operations

#### **`lib/supabase/middleware.ts`** - Session Middleware
- ✅ Automatic session refresh on navigation
- ✅ Route protection based on authentication
- ✅ OAuth callback handling
- ✅ API route authentication
- ✅ Admin route protection

### **2. New React Provider System**

#### **`app/providers.tsx`** - Supabase Auth Provider
- ✅ Replaces NextAuth SessionProvider
- ✅ Authentication state management
- ✅ Auth hooks (`useAuth`, `useRequireAuth`, etc.)
- ✅ HOC for protected components (`withAuth`)
- ✅ Sign in/out button components

### **3. Updated App Architecture**

#### **`app/layout.tsx`** - Updated Layout
- ✅ Now uses Supabase AuthProvider
- ✅ Gets initial session on server for SSR
- ✅ Passes session to client components

#### **`middleware.ts`** - New Middleware
- ✅ Replaced NextAuth middleware with Supabase
- ✅ Handles all routes with comprehensive matching

---

## 🚀 **Migration Steps**

### **Step 1: Install Required Dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### **Step 2: Add Required Type Definitions**

Create `types/supabase.ts`:
```typescript
// Generate this from your Supabase dashboard
export interface Database {
  public: {
    Tables: {
      // Add your table definitions here
      albums: {
        Row: {
          id: string
          title: string
          user_id: string
          created_at: string
          // ... other fields
        }
        Insert: {
          // ... insert types
        }
        Update: {
          // ... update types  
        }
      }
      // ... other tables
    }
  }
}
```

### **Step 3: Configure Supabase OAuth**

In your Supabase Dashboard:

1. **Go to Authentication → Providers**
2. **Enable Google OAuth**
3. **Add these redirect URLs:**
   - `http://localhost:3004/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
4. **Copy your Google OAuth credentials to environment variables**

### **Step 4: Create OAuth Callback Route**

Create `app/auth/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

### **Step 5: Update API Routes**

Replace NextAuth session calls in your API routes:

**Before (NextAuth):**
```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
const userId = session.user.id
```

**After (Supabase):**
```typescript
import { getUser } from "@/lib/supabase/server"

const user = await getUser()
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
const userId = user.id
```

### **Step 6: Update Components**

Replace NextAuth hooks in your React components:

**Before (NextAuth):**
```typescript
import { useSession, signIn, signOut } from "next-auth/react"

const { data: session, status } = useSession()
```

**After (Supabase):**
```typescript
import { useAuth } from "@/app/providers"

const { user, session, loading, signIn, signOut } = useAuth()
```

### **Step 7: Update Database Queries**

Your API routes can now use the server database helpers:

```typescript
import { serverDb } from "@/lib/supabase/server"

// Get user's albums with proper authentication
const albums = await serverDb.getAlbums()

// Create album with user context
const newAlbum = await serverDb.createAlbum(albumData)
```

---

## 🗑️ **Cleanup Tasks**

### **Files to Remove:**
```bash
# Remove NextAuth configuration
rm lib/auth.ts

# Remove NextAuth session provider (if not used elsewhere)
rm components/providers/session-provider.tsx

# Remove NextAuth API routes
rm -rf app/api/auth/[...nextauth]/
rm -rf app/api/auth/signup/
rm -rf app/api/auth/verify-email/
```

### **Dependencies to Remove:**
```bash
npm uninstall next-auth @auth/prisma-adapter bcryptjs
```

### **Environment Variables to Remove:**
From `.env.local`:
```bash
# Remove these NextAuth variables
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

### **Database Tables to Remove (Optional):**
```sql
-- Remove NextAuth tables if no longer needed
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts; 
DROP TABLE IF EXISTS verification_tokens;
```

---

## 🔧 **Configuration Updates**

### **Update Sign-In Components**

Replace your existing sign-in buttons:

```typescript
import { SignInButton } from "@/app/providers"

// Simple usage
<SignInButton className="btn btn-primary" />

// Custom usage
const { signIn, loading } = useAuth()
<button onClick={() => signIn()} disabled={loading}>
  {loading ? "Signing in..." : "Sign In with Google"}
</button>
```

### **Update Protected Routes**

Use the new auth hooks:

```typescript
import { useRequireAuth, withAuth } from "@/app/providers"

// Hook approach
function ProtectedComponent() {
  const user = useRequireAuth() // Redirects if not authenticated
  
  if (!user) return null
  
  return <div>Protected content</div>
}

// HOC approach  
export default withAuth(ProtectedComponent)
```

---

## 🔍 **Testing the Migration**

### **1. Test Authentication Flow**
- ✅ Visit `/auth/signin` → should redirect to Google OAuth
- ✅ Complete Google login → should redirect to `/dashboard`
- ✅ Navigate between pages → session should persist
- ✅ Refresh page → should stay logged in

### **2. Test API Routes**
- ✅ Make authenticated requests → should work without 403 errors
- ✅ Access albums → should load user's albums
- ✅ Upload files → should work with proper authentication

### **3. Test Storage Operations**
- ✅ Photo uploads → should work with Supabase storage
- ✅ File access → should respect user permissions
- ✅ RLS policies → should enforce proper access control

### **4. Use the Debug Page**
Visit `/debug/auth` to run comprehensive diagnostics and verify everything is working.

---

## 🐛 **Troubleshooting**

### **Common Issues:**

#### **1. "Database not available" errors**
- Ensure your database connection is working
- Check that all required tables exist
- Verify environment variables are set correctly

#### **2. OAuth callback failures**
- Check redirect URLs in Supabase dashboard
- Verify `app/auth/callback/route.ts` exists
- Check browser network tab for error details

#### **3. Session not persisting**
- Clear browser cookies and localStorage
- Check that middleware is running on all routes
- Verify cookie settings in browser dev tools

#### **4. RLS policy errors**
- Ensure your database has proper RLS policies
- Check that user IDs match between systems
- Use service role for admin operations if needed

### **Need Help?**
- Check the `/debug/auth` page for detailed diagnostics
- Review browser console for error messages
- Check server logs for authentication errors
- Verify all environment variables are set correctly

---

## 🎉 **Migration Complete!**

Once you've completed all steps:

1. ✅ **NextAuth removed** and replaced with Supabase Auth
2. ✅ **Sessions persist** across page navigation  
3. ✅ **API routes** use proper Supabase authentication
4. ✅ **Storage operations** work with authenticated context
5. ✅ **OAuth login** works seamlessly with Google
6. ✅ **No more 403 errors** on authenticated requests

Your Adventure Log app now uses a unified Supabase authentication system! 🚀