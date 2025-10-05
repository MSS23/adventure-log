'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LoginFormData, SignupFormData, ProfileFormData } from '@/lib/validations/auth'
import { log } from '@/lib/utils/logger'

export function useAuthActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const signIn = async (data: LoginFormData) => {
    try {
      setLoading(true)
      setError(null)

      log.info('Attempting sign in', { email: data.email })

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        log.error('Sign in error', { error: error.message, status: error.status })

        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. If you just signed up, please verify your email first before signing in.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.')
        } else {
          throw error
        }
      }

      log.info('Sign in successful', { userId: authData.user?.id })
      router.push('/feed')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (data: SignupFormData) => {
    try {
      setLoading(true)
      setError(null)

      log.info('Starting signup process', { email: data.email })

      // Attempt signup
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        }
      })

      if (error) {
        log.error('Signup error', { error: error.message })
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.')
        } else if (error.message.includes('Invalid email')) {
          throw new Error('Please enter a valid email address.')
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a few minutes before trying again.')
        } else if (error.message.includes('email_address_invalid') || error.message.includes('is invalid')) {
          throw new Error('Email validation failed. This may be a server configuration issue. Please contact support if this persists.')
        } else {
          throw new Error(error.message)
        }
      }

      if (!authData.user) {
        throw new Error('No user data returned from signup')
      }

      log.info('Signup successful', {
        userId: authData.user.id,
        emailConfirmed: authData.user.email_confirmed_at,
        identities: authData.user.identities?.length || 0
      })

      // Check if email confirmation is required
      // If user.email_confirmed_at is null, email confirmation is required
      if (!authData.user.email_confirmed_at) {
        log.info('Email confirmation required')
        // Success state will show email verification message
        return
      }

      // If email is auto-confirmed, redirect to setup
      log.info('Email auto-confirmed, redirecting to setup')
      router.push('/setup')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during signup'
      setError(errorMessage)
      throw error // Re-throw to let component handle success state
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      log.info('Creating profile', { userId: user.id, username: data.username })

      // Use upsert to handle cases where profile already exists (created by trigger)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          website: data.website,
          location: data.location,
          privacy_level: "public",
        }, {
          onConflict: 'id'
        })

      if (error) {
        log.error('Profile creation failed', { error: error.message })
        throw error
      }

      log.info('Profile created successfully', { userId: user.id })

      // Initialize user level as Level 1 Explorer
      const { error: levelError } = await supabase
        .from('user_levels')
        .upsert({
          user_id: user.id,
          current_level: 1,
          current_title: 'Explorer',
          total_experience: 0,
          albums_created: 0,
          countries_visited: 0,
          photos_uploaded: 0,
          social_interactions: 0
        }, {
          onConflict: 'user_id'
        })

      if (levelError) {
        log.warn('Failed to initialize user level', { error: levelError })
        // Don't fail the whole process if level initialization fails
      }

      router.push('/feed')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(email)

      if (error) throw error

      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    signIn,
    signUp,
    createProfile,
    resetPassword,
    loading,
    error,
    setError
  }
}