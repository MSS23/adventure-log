"use client";

/**
 * Application Providers for Next.js App Router
 * 
 * This file contains all the providers that wrap the application,
 * including the new Supabase authentication provider that replaces NextAuth.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { User, Session } from '@supabase/supabase-js'

// Supabase Auth Context Types
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (options?: { redirectTo?: string }) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode
  initialSession?: Session | null
}

/**
 * Supabase Auth Provider
 * 
 * Manages authentication state throughout the application.
 * Replaces NextAuth SessionProvider with Supabase auth.
 */
export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [session, setSession] = useState<Session | null>(initialSession ?? null)
  const [loading, setLoading] = useState(!initialSession)
  const router = useRouter()
  const supabase = createClient()

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true

    async function getInitialSession() {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          toast.error('Authentication error. Please try signing in again.')
        }
        
        if (isMounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing session:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Only get initial session if we don't have one
    if (!initialSession) {
      getInitialSession()
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [supabase.auth, initialSession])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email)
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            toast.success('Successfully signed in!')
            // Refresh the page to ensure all server components get the new session
            router.refresh()
            break
            
          case 'SIGNED_OUT':
            toast.success('Successfully signed out!')
            // Redirect to home page
            router.push('/')
            router.refresh()
            break
            
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully')
            // Refresh the page to ensure server components get the new token
            router.refresh()
            break
            
          case 'USER_UPDATED':
            console.log('User profile updated')
            break
            
          default:
            break
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])

  // Sign in with Google
  const signIn = async (_options?: { redirectTo?: string }) => {
    try {
      setLoading(true)
      
      // Construct redirect URL with better error handling
      const redirectTo = `${window.location.origin}/auth/callback`
      
      console.log('[Auth Provider] Initiating Google OAuth sign-in with redirect:', redirectTo)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      })

      if (error) {
        console.error('[Auth Provider] Sign in error:', error)
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid credentials. Please check your email and password.')
        } else if (error.message.includes('too many requests')) {
          toast.error('Too many sign-in attempts. Please wait a moment and try again.')
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection and try again.')
        } else {
          toast.error(`Sign in failed: ${error.message}`)
        }
        
        setLoading(false)
        return
      }

      console.log('[Auth Provider] OAuth redirect initiated successfully')
      // Loading will be set to false by the auth state change listener or page redirect
      
    } catch (error) {
      console.error('[Auth Provider] Unexpected sign in error:', error)
      toast.error('An unexpected error occurred during sign in. Please try again.')
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      
      console.log('[Auth Provider] Initiating sign out')
      
      const { error } = await supabase.auth.signOut({
        scope: 'local' // Only sign out from this browser/device
      })
      
      if (error) {
        console.error('[Auth Provider] Sign out error:', error)
        toast.error(`Sign out failed: ${error.message}`)
        setLoading(false)
        return
      }
      
      console.log('[Auth Provider] Sign out successful')
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        try {
          // Clear any app-specific localStorage data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('adventure-log-')) {
              localStorage.removeItem(key)
            }
          })
        } catch (error) {
          console.warn('[Auth Provider] Error clearing localStorage:', error)
        }
      }
      
      // Loading will be set to false by the auth state change listener
      
    } catch (error) {
      console.error('[Auth Provider] Unexpected sign out error:', error)
      toast.error('An unexpected error occurred during sign out')
      setLoading(false)
    }
  }

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        toast.error('Failed to refresh session')
      } else {
        setSession(data.session)
        setUser(data.user)
        toast.success('Session refreshed successfully')
      }
    } catch (error) {
      console.error('Session refresh error:', error)
      toast.error('An unexpected error occurred while refreshing session')
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use the Auth context
 * 
 * Usage: const { user, session, loading, signIn, signOut } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

/**
 * Hook to get current user (throws if not authenticated)
 * 
 * Usage: const user = useRequireAuth()
 */
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please sign in to access this page')
      router.push('/auth/signin')
    }
  }, [user, loading, router])
  
  if (loading) {
    return null // or loading component
  }
  
  if (!user) {
    return null // Will redirect via useEffect
  }
  
  return user
}

/**
 * Hook to get user ID safely
 */
export function useUserId() {
  const { user } = useAuth()
  return user?.id ?? null
}

/**
 * Hook to get user email safely
 */
export function useUserEmail() {
  const { user } = useAuth()
  return user?.email ?? null
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, loading } = useAuth()
  return { isAuthenticated: !!user, loading }
}

/**
 * Higher-order component to require authentication
 * 
 * Usage: export default withAuth(MyComponent)
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const user = useRequireAuth()
    
    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to access this page.</p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

/**
 * Loading component for authentication states
 */
export function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Sign in button component
 */
export function SignInButton({ 
  className,
  children = "Sign In with Google" 
}: { 
  className?: string
  children?: ReactNode 
}) {
  const { signIn, loading } = useAuth()
  
  return (
    <button
      onClick={() => signIn()}
      disabled={loading}
      className={className}
    >
      {loading ? 'Signing in...' : children}
    </button>
  )
}

/**
 * Sign out button component
 */
export function SignOutButton({ 
  className,
  children = "Sign Out" 
}: { 
  className?: string
  children?: ReactNode 
}) {
  const { signOut, loading } = useAuth()
  
  return (
    <button
      onClick={() => signOut()}
      disabled={loading}
      className={className}
    >
      {loading ? 'Signing out...' : children}
    </button>
  )
}