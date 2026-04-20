'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertCircle, Mail, RefreshCw, CheckCircle, Loader2, Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { log } from '@/lib/utils/logger'
import { LoginFormData, loginSchema } from '@/lib/validations/auth'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const { signIn, resendVerificationEmail, loading, error, setError } = useAuthActions()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const rememberMe = watch('rememberMe')

  // Load remembered email on mount
  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const { preferences, PREFERENCE_KEYS } = await import('@/lib/utils/preferences')
        const isRemembered = await preferences.get(PREFERENCE_KEYS.REMEMBER_ME)
        const rememberedEmail = await preferences.get(PREFERENCE_KEYS.REMEMBERED_EMAIL)

        if (isRemembered === 'true' && rememberedEmail) {
          setValue('email', rememberedEmail)
          setValue('rememberMe', true)
        }
      } catch (err) {
        log.error('Error loading remembered email', { component: 'LoginPage', action: 'load-remembered-email' }, err as Error)
      }
    }

    loadRememberedEmail()
  }, [setValue])

  // Check for error messages from URL params (e.g., from email verification callback)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (errorParam === 'verification_failed') {
      setUrlError(messageParam || 'Email verification failed. Please try signing up again.')
    } else if (errorParam === 'no_code') {
      setUrlError('Invalid verification link. Please check your email for the correct link.')
    }
  }, [searchParams])

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleResendVerification = useCallback(async () => {
    if (!verificationEmail || cooldown > 0) return

    setResendLoading(true)
    setResendSuccess(false)
    const success = await resendVerificationEmail(verificationEmail)

    if (success) {
      setResendSuccess(true)
      setCooldown(60)
      setError(null)
    }
    setResendLoading(false)
  }, [verificationEmail, cooldown, resendVerificationEmail, setError])

  const onSubmit = async (data: LoginFormData) => {
    setUrlError(null) // Clear URL error when submitting
    setNeedsVerification(false)
    setResendSuccess(false)
    setVerificationEmail(data.email) // Save email for potential resend

    await signIn(data)
  }

  // Check if current error indicates email verification is needed
  useEffect(() => {
    if (error && (error.toLowerCase().includes('verify') || error.toLowerCase().includes('confirmed'))) {
      setNeedsVerification(true)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4">
      <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20">
              <Compass className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-olive-950 dark:text-olive-50">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Sign in to continue your adventure
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {(error || urlError) && !needsVerification && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error || urlError}</span>
              </div>
            )}

            {/* Email Verification Required Section */}
            {needsVerification && (
              <div className="p-4 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-700/30 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-olive-600 dark:text-olive-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-olive-800 dark:text-olive-200">Email Verification Required</h4>
                    <p className="text-sm text-olive-700 dark:text-olive-400">
                      Please verify your email address before signing in. Check your inbox for the verification link.
                    </p>
                  </div>
                </div>

                {/* Resend Success Message */}
                {resendSuccess && (
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-300">Verification email sent! Check your inbox.</p>
                  </div>
                )}

                {/* Resend Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendLoading || cooldown > 0}
                  className="w-full cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend in {cooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend verification email
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-olive-800 dark:text-olive-200">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                {...register('email')}
                className={`text-base focus-visible:ring-2 focus-visible:ring-olive-500 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-olive-800 dark:text-olive-200">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`text-base focus-visible:ring-2 focus-visible:ring-olive-500 ${errors.password ? 'border-red-500 pr-10' : 'pr-10'}`}
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
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setValue('rememberMe', checked === true)}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer text-olive-700 dark:text-olive-300"
                >
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-colors duration-200 cursor-pointer hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold text-base shadow-lg shadow-olive-700/20 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-olive-200 dark:border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#111111] px-2 text-olive-500 dark:text-olive-500">Or</span>
              </div>
            </div>

            <p className="text-sm text-center text-olive-600 dark:text-olive-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-olive-700 hover:text-olive-800 dark:text-olive-400 dark:hover:text-olive-300 font-semibold transition-colors duration-200 cursor-pointer hover:underline"
              >
                Sign up for free
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-700"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
