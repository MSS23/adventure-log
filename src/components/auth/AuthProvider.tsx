'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { log } from '@/lib/utils/logger'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  authLoading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface ProfileCache {
  data: Profile
  timestamp: number
  ttl: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const profileCache = useRef<Map<string, ProfileCache>>(new Map())
  const supabase = createClient()

  const createProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // Generate username similar to database trigger
      // Ensure it matches the constraint: ^[a-zA-Z0-9_]{3,50}$
      const cleanId = userId.replace(/-/g, '').substring(0, 8)
      const username = `user_${cleanId}`

      const profileData = {
        id: userId,
        username,
        display_name: 'New User',
        privacy_level: 'public' as const
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        // Log detailed error information
        log.error('Profile creation error details', {
          component: 'AuthProvider',
          action: 'createProfile',
          userId,
          username,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        })

        // Handle unique constraint violation by generating a different username
        if (error.code === '23505' && error.message.includes('username')) {
          const timestamp = Date.now().toString().slice(-4)
          const fallbackUsername = `user_${cleanId}_${timestamp}`

          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .insert({
              ...profileData,
              username: fallbackUsername
            })
            .select()
            .single()

          if (retryError) {
            log.error('Error creating profile with fallback username', {
              component: 'AuthProvider',
              action: 'createProfile',
              userId,
              fallbackUsername,
              error: retryError
            })
            return null
          }

          log.info('Profile created with fallback username', {
            component: 'AuthProvider',
            action: 'createProfile',
            userId,
            username: fallbackUsername
          })

          return retryData as Profile
        }
        // Handle primary key constraint (profile already exists)
        else if (error.code === '23505' && (error.message.includes('id') || error.message.includes('pkey'))) {
          log.warn('Profile already exists, attempting to fetch existing profile', {
            component: 'AuthProvider',
            action: 'createProfile',
            userId
          })

          // Profile already exists, try to fetch it
          try {
            const { data: existingData, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single()

            if (!fetchError && existingData) {
              log.info('Successfully fetched existing profile after creation conflict', {
                component: 'AuthProvider',
                action: 'createProfile',
                userId
              })
              return existingData as Profile
            }
          } catch (fetchErr) {
            log.error('Failed to fetch existing profile after creation conflict', {
              component: 'AuthProvider',
              action: 'createProfile',
              userId,
              error: fetchErr
            })
          }
        }

        log.error('Error creating profile', {
          component: 'AuthProvider',
          action: 'createProfile',
          userId,
          username,
          error
        })
        return null
      }

      log.info('Profile created successfully', {
        component: 'AuthProvider',
        action: 'createProfile',
        userId,
        username
      })

      return data as Profile
    } catch (error) {
      log.error('Error creating profile', {
        component: 'AuthProvider',
        action: 'createProfile',
        userId
      }, error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }, [supabase])

  const fetchProfile = useCallback(async (userId: string, useCache = true): Promise<Profile | null> => {
    // Check cache first
    if (useCache) {
      const cached = profileCache.current.get(userId)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Log the specific error details for debugging
        log.error('Profile fetch error details', {
          component: 'AuthProvider',
          action: 'fetchProfile',
          userId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        })

        // Handle different types of errors
        if (error.code === 'PGRST116' || error.message.includes('No rows returned')) {
          log.warn('Profile not found, attempting to create', {
            component: 'AuthProvider',
            action: 'fetchProfile',
            userId
          })

          const newProfile = await createProfile(userId)
          if (newProfile) {
            // Cache the newly created profile
            profileCache.current.set(userId, {
              data: newProfile,
              timestamp: Date.now(),
              ttl: PROFILE_CACHE_TTL
            })
            return newProfile
          }
        }
        // Handle RLS policy errors (406 Not Acceptable)
        else if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          log.error('RLS policy blocking profile access', {
            component: 'AuthProvider',
            action: 'fetchProfile',
            userId,
            error: error.message
          })

          // Try to create profile if RLS is preventing access to existing profile
          const newProfile = await createProfile(userId)
          if (newProfile) {
            profileCache.current.set(userId, {
              data: newProfile,
              timestamp: Date.now(),
              ttl: PROFILE_CACHE_TTL
            })
            return newProfile
          }
        }

        log.error('Error fetching profile', {
          component: 'AuthProvider',
          action: 'fetchProfile',
          userId,
          error
        })
        return null
      }

      const profileData = data as Profile

      // Cache the profile
      profileCache.current.set(userId, {
        data: profileData,
        timestamp: Date.now(),
        ttl: PROFILE_CACHE_TTL
      })

      return profileData
    } catch (error) {
      log.error('Error fetching profile', {
        component: 'AuthProvider',
        action: 'fetchProfile',
        userId
      }, error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }, [supabase, createProfile])

  const loadProfileAsync = useCallback(async (userId: string) => {
    setProfileLoading(true)
    try {
      const profileData = await fetchProfile(userId)
      setProfile(profileData)
    } finally {
      setProfileLoading(false)
    }
  }, [fetchProfile])

  const refreshProfile = async () => {
    if (user) {
      setProfileLoading(true)
      try {
        const profileData = await fetchProfile(user.id, false) // Skip cache on refresh
        setProfile(profileData)
      } finally {
        setProfileLoading(false)
      }
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)

        // Set auth loading to false immediately after getting session
        setAuthLoading(false)

        // Load profile asynchronously without blocking
        if (session?.user) {
          loadProfileAsync(session.user.id)
        }
      } catch (error) {
        log.error('Error getting session', { error })
        setAuthLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        // Auth state change is immediate
        setAuthLoading(false)

        if (session?.user) {
          // Load profile asynchronously
          loadProfileAsync(session.user.id)
        } else {
          setProfile(null)
          setProfileLoading(false)
          // Clear cache on signout
          profileCache.current.clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfileAsync, supabase.auth])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setProfileLoading(false)
      profileCache.current.clear()
    } catch (error) {
      log.error('Error signing out', { error })
    }
  }

  const value = {
    user,
    profile,
    authLoading,
    profileLoading,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}