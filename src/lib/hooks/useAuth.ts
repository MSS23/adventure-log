'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LoginFormData, SignupFormData, ProfileFormData } from '@/lib/validations/auth'

export function useAuthActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const signIn = async (data: LoginFormData) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      router.push('/dashboard')
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

      // Attempt signup with minimal options to avoid domain restrictions
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for testing
        }
      })

      if (error) {
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

      // Check if profile already exists (created by database trigger)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', authData.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile check failed:', profileError)
        setError(`Profile setup failed: ${profileError.message}`)
        return
      }

      if (existingProfile) {
        router.push('/dashboard')
      } else {
        router.push('/setup')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during signup'
      setError(errorMessage)
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

      if (error) throw error

      router.push('/dashboard')
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