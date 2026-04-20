'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Check, X, Mail, User, Compass, Loader2, CheckCircle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { SignupFormData, signupSchema } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/client'

interface PasswordStrength {
  hasMinLength: boolean
  hasLowercase: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
  score: number
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false, hasLowercase: false, hasUppercase: false,
    hasNumber: false, hasSpecialChar: false, score: 0,
  })
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null)

  const { signUp, loading, error } = useAuthActions()
  const supabase = createClient()

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const watchedFields = watch()

  // Password strength checker
  useEffect(() => {
    if (watchedFields.password) {
      const pw = watchedFields.password
      const hasMinLength = pw.length >= 8
      const hasLowercase = /[a-z]/.test(pw)
      const hasUppercase = /[A-Z]/.test(pw)
      const hasNumber = /\d/.test(pw)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pw)
      const score = [hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length
      setPasswordStrength({ hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecialChar, score })
    }
  }, [watchedFields.password])

  // Username availability check with debounce
  const checkUsername = useCallback(async (username: string) => {
    const normalized = username.trim().toLowerCase()
    if (!normalized || normalized.length < 3 || !/^[a-z0-9_]+$/.test(normalized)) {
      setUsernameStatus(null)
      return
    }

    const reserved = ['admin', 'administrator', 'root', 'system', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'ftp']
    if (reserved.includes(normalized)) {
      setUsernameStatus('taken')
      return
    }

    setUsernameStatus('checking')
    try {
      const { error: fetchError } = await supabase
        .from('users')
        .select('username')
        .eq('username', normalized)
        .single()

      if (fetchError?.code === 'PGRST116') {
        setUsernameStatus('available')
      } else {
        setUsernameStatus('taken')
      }
    } catch {
      setUsernameStatus(null)
    }
  }, [supabase])

  useEffect(() => {
    if (!watchedFields.username) {
      setUsernameStatus(null)
      return
    }
    const timeout = setTimeout(() => checkUsername(watchedFields.username), 500)
    return () => clearTimeout(timeout)
  }, [watchedFields.username, checkUsername])

  const onSubmit = async (data: SignupFormData) => {
    if (usernameStatus === 'taken') return
    try {
      await signUp(data)
      setSignupSuccess(true)
    } catch (err) {
      log.error('Signup failed', { component: 'SignupPage', email: data.email }, err instanceof Error ? err : new Error(String(err)))
    }
  }

  const strengthLabel = (score: number) => {
    if (score <= 1) return { text: 'Very Weak', color: 'text-red-500' }
    if (score <= 2) return { text: 'Weak', color: 'text-orange-500' }
    if (score <= 3) return { text: 'Fair', color: 'text-yellow-600' }
    if (score <= 4) return { text: 'Good', color: 'text-olive-600' }
    return { text: 'Strong', color: 'text-green-600' }
  }

  const strengthBarColor = (score: number) => {
    if (score <= 1) return 'bg-red-500'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-olive-500'
    return 'bg-green-500'
  }

  // ── Success state ──
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-3">
              <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Welcome, @{watchedFields.username?.toLowerCase()}!
            </CardTitle>
            <CardDescription className="text-olive-600 dark:text-olive-400">
              Check your email to verify your account before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-700/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                <div className="text-sm text-olive-700 dark:text-olive-300 space-y-1.5">
                  <p className="font-medium">Verify your email to get started:</p>
                  <ol className="list-decimal list-inside space-y-1 text-olive-600 dark:text-olive-400">
                    <li>Open the verification link in your inbox</li>
                    <li>Come back and sign in</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button asChild className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 transition-all duration-200 cursor-pointer active:scale-[0.97]">
              <Link href="/login">Continue to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── Signup form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
        <CardHeader className="space-y-3 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20">
              <Compass className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-olive-950 dark:text-olive-50">
            Create your account
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Start mapping your adventures
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2">
                <X className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-olive-800 dark:text-olive-200">
                Username <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-olive-500 dark:text-olive-400 pointer-events-none font-medium">
                  @
                </span>
                <Input
                  id="username"
                  placeholder="your_username"
                  autoComplete="username"
                  maxLength={30}
                  {...register('username')}
                  className={cn(
                    'pl-8 pr-10 text-base focus-visible:ring-2 focus-visible:ring-olive-500',
                    errors.username ? 'border-red-500' :
                    usernameStatus === 'taken' ? 'border-red-500' :
                    usernameStatus === 'available' ? 'border-green-500' : ''
                  )}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-olive-400" />}
                  {usernameStatus === 'available' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {errors.username && (
                <p className="text-xs text-red-600">{errors.username.message}</p>
              )}
              {!errors.username && usernameStatus === 'taken' && (
                <p className="text-xs text-red-600">This username is already taken</p>
              )}
              {!errors.username && usernameStatus === 'available' && (
                <p className="text-xs text-green-600">Username is available</p>
              )}
              <p className="text-[11px] text-stone-500 dark:text-stone-500">
                Letters, numbers, underscores. This is your unique handle.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-olive-800 dark:text-olive-200">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="displayName"
                placeholder="Your Name"
                autoComplete="name"
                maxLength={50}
                {...register('displayName')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.displayName ? 'border-red-500' : '')}
              />
              {errors.displayName && (
                <p className="text-xs text-red-600">{errors.displayName.message}</p>
              )}
              <p className="text-[11px] text-stone-500 dark:text-stone-500">
                How others will see you. You can change this later.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-olive-800 dark:text-olive-200">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                {...register('email')}
                className={cn('text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.email ? 'border-red-500' : '')}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-olive-800 dark:text-olive-200">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  {...register('password')}
                  className={cn('pr-10 text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.password ? 'border-red-500' : '')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center min-w-[44px] min-h-[44px] justify-center cursor-pointer transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 rounded-md"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-olive-500" /> : <Eye className="h-4 w-4 text-olive-500" />}
                </button>
              </div>

              {/* Password strength — compact */}
              {watchedFields.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 flex-1 mr-3">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            level <= passwordStrength.score ? strengthBarColor(passwordStrength.score) : 'bg-stone-200 dark:bg-stone-700'
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn('text-xs font-medium', strengthLabel(passwordStrength.score).color)}>
                      {strengthLabel(passwordStrength.score).text}
                    </span>
                  </div>

                  {/* Requirements — minimal 2-col grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {[
                      { ok: passwordStrength.hasMinLength, label: '8+ characters' },
                      { ok: passwordStrength.hasLowercase, label: 'Lowercase' },
                      { ok: passwordStrength.hasUppercase, label: 'Uppercase' },
                      { ok: passwordStrength.hasNumber, label: 'Number' },
                      { ok: passwordStrength.hasSpecialChar, label: 'Special char' },
                    ].map(req => (
                      <div key={req.label} className={cn('flex items-center gap-1', req.ok ? 'text-green-600 dark:text-green-400' : 'text-stone-400')}>
                        {req.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-olive-800 dark:text-olive-200">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                  className={cn('pr-10 text-base focus-visible:ring-2 focus-visible:ring-olive-500', errors.confirmPassword ? 'border-red-500' : '')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center min-w-[44px] min-h-[44px] justify-center cursor-pointer transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2 rounded-md"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-olive-500" /> : <Eye className="h-4 w-4 text-olive-500" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
              {!errors.confirmPassword && watchedFields.confirmPassword && watchedFields.password === watchedFields.confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-stone-500 dark:text-stone-500 leading-relaxed">
              By signing up you agree to our{' '}
              <Link href="/terms" className="text-olive-600 dark:text-olive-400 hover:underline cursor-pointer transition-colors duration-200">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-olive-600 dark:text-olive-400 hover:underline cursor-pointer transition-colors duration-200">Privacy Policy</Link>.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold text-base shadow-lg shadow-olive-700/20 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking' || (!!watchedFields.password && passwordStrength.score < 3)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Create Account
                </span>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-olive-200 dark:border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#111111] px-2 text-olive-500">Or</span>
              </div>
            </div>

            <p className="text-sm text-center text-olive-600 dark:text-olive-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-olive-700 hover:text-olive-800 dark:text-olive-400 dark:hover:text-olive-300 font-semibold transition-colors duration-200 cursor-pointer hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
