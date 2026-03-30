'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Compass, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validToken, setValidToken] = useState<boolean | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkResetToken = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error || !data.session) {
          setValidToken(false)
          return
        }

        setValidToken(true)
      } catch (err) {
        log.error('Error checking reset token', {
          component: 'ResetPasswordPage',
          action: 'checkResetToken'
        }, err instanceof Error ? err : new Error(String(err)))
        setValidToken(false)
      }
    }

    checkResetToken()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError('Both password fields are required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      log.info('Password reset successful', {
        component: 'ResetPasswordPage',
        action: 'resetPassword'
      })

      setTimeout(() => {
        router.push('/login?message=Password reset successful')
      }, 2000)

    } catch (err) {
      log.error('Password reset failed', {
        component: 'ResetPasswordPage',
        action: 'resetPassword'
      }, err instanceof Error ? err : new Error(String(err)))

      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // Invalid or expired token
  if (validToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-3">
              <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Invalid reset link
            </CardTitle>
            <CardDescription className="text-olive-600 dark:text-olive-400">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-300 text-center">
                Password reset links expire after 1 hour for security reasons.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button asChild className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 transition-all duration-200 cursor-pointer active:scale-[0.97]">
              <Link href="/forgot-password">Request New Reset Link</Link>
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1 text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-colors duration-200 cursor-pointer hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Loading state
  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
        <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Password updated
            </CardTitle>
            <CardDescription className="text-olive-600 dark:text-olive-400">
              Your password has been updated successfully. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button asChild className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 transition-all duration-200 cursor-pointer active:scale-[0.97]">
              <Link href="/login">Continue to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
      <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20">
              <Compass className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-olive-950 dark:text-olive-50">
            Reset your password
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Choose a strong password for your account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-olive-800 dark:text-olive-200">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  minLength={6}
                  className={`text-base pr-10 focus-visible:ring-2 focus-visible:ring-olive-500 ${error ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center min-w-[44px] min-h-[44px] justify-center cursor-pointer transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 rounded-md"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-olive-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-olive-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-500">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-olive-800 dark:text-olive-200">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  className={`text-base pr-10 focus-visible:ring-2 focus-visible:ring-olive-500 ${error ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center min-w-[44px] min-h-[44px] justify-center cursor-pointer transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 rounded-md"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-olive-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-olive-500" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold text-base shadow-lg shadow-olive-700/20 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Update Password
                </span>
              )}
            </Button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1 text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-colors duration-200 cursor-pointer hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
