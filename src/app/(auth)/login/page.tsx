'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertCircle, Mail, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
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
        console.error('Error loading remembered email:', err)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">AL</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center text-gray-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Sign in to continue your adventure
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {(error || urlError) && !needsVerification && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error || urlError}</span>
              </div>
            )}

            {/* Email Verification Required Section */}
            {needsVerification && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-amber-800">Email Verification Required</h4>
                    <p className="text-sm text-amber-700">
                      Please verify your email address before signing in. Check your inbox for the verification link.
                    </p>
                  </div>
                </div>

                {/* Resend Success Message */}
                {resendSuccess && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700">Verification email sent! Check your inbox.</p>
                  </div>
                )}

                {/* Resend Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendLoading || cooldown > 0}
                  className="w-full"
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-700" />
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
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold text-base shadow-lg shadow-teal-500/30 transition-all"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <p className="text-sm text-center text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}