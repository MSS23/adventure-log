'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Check, X, Mail, User, Camera, Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthActions } from '@/lib/hooks/useAuth'
import { SignupFormData, signupSchema } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'

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
    hasMinLength: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    score: 0
  })
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [formProgress, setFormProgress] = useState(0)

  const { signUp, loading, error } = useAuthActions()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const watchedFields = watch()

  // Check password strength
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const hasMinLength = password.length >= 8
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const criteria = [hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecialChar]
    const score = criteria.filter(Boolean).length

    return {
      hasMinLength,
      hasLowercase,
      hasUppercase,
      hasNumber,
      hasSpecialChar,
      score
    }
  }

  // Update password strength when password changes
  useEffect(() => {
    if (watchedFields.password) {
      setPasswordStrength(checkPasswordStrength(watchedFields.password))
    }
  }, [watchedFields.password])

  // Update form progress
  useEffect(() => {
    const fields = ['email', 'password', 'confirmPassword']
    const filledFields = fields.filter(field => watchedFields[field as keyof SignupFormData]?.length > 0)
    const progress = (filledFields.length / fields.length) * 100
    setFormProgress(progress)
  }, [watchedFields])

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signUp(data)
      // If we reach here without error, signup was successful
      // (signUp will redirect to /setup if email is auto-confirmed)
      setSignupSuccess(true)
    } catch (err) {
      // Error handling is already done by useAuthActions
      // Don't show success if there was an error
      log.error('Signup failed', { component: 'SignupPage', email: data.email }, err instanceof Error ? err : new Error(String(err)))
    }
  }

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return { text: 'Very Weak', color: 'text-red-600' }
    if (score <= 2) return { text: 'Weak', color: 'text-orange-600' }
    if (score <= 3) return { text: 'Fair', color: 'text-yellow-600' }
    if (score <= 4) return { text: 'Good', color: 'text-blue-600' }
    return { text: 'Strong', color: 'text-green-600' }
  }

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  // Success state
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Welcome to Adventure Log!
            </CardTitle>
            <CardDescription>
              Your account has been created successfully! Please check your email to verify your account before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">⚠️ Important: Email Verification Required</h4>
                  <ol className="text-sm text-blue-700 mt-2 space-y-2">
                    <li><strong>1. Check your email inbox</strong> for a verification link</li>
                    <li><strong>2. Click the verification link</strong> to activate your account</li>
                    <li><strong>3. Return here and sign in</strong> with your credentials</li>
                    <li className="text-red-600 font-medium mt-2">⚠️ You cannot sign in until you verify your email</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Camera className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-700">Share Photos</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Globe className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-700">Track Travels</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">
                Continue to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">
              Create Your Adventure Account
            </CardTitle>
            <CardDescription>
              Join thousands of travelers sharing their journeys
            </CardDescription>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Setup Progress</span>
              <span className="text-gray-600">{Math.round(formProgress)}%</span>
            </div>
            <Progress value={formProgress} className="h-2" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="default" className="text-xs">
              Step 1 of 3
            </Badge>
            <span className="text-xs text-gray-500">Account Details</span>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Signup failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                {...register('email')}
                className={cn(
                  'transition-all',
                  errors.email ? 'border-red-500 focus:border-red-500' :
                  watchedFields.email ? 'border-green-500 focus:border-green-500' : ''
                )}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.email.message}
                </p>
              )}
              {!errors.email && watchedFields.email && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Valid email address
                </p>
              )}
              <p className="text-xs text-gray-600">
                💡 We&apos;ll send you a verification email to confirm your account
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  {...register('password')}
                  className={cn(
                    'pr-10 transition-all',
                    errors.password ? 'border-red-500 focus:border-red-500' :
                    passwordStrength.score >= 3 ? 'border-green-500 focus:border-green-500' : ''
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {watchedFields.password && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Password Strength:</span>
                    <span className={cn('text-sm font-medium', getPasswordStrengthText(passwordStrength.score).color)}>
                      {getPasswordStrengthText(passwordStrength.score).text}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded',
                          level <= passwordStrength.score
                            ? getPasswordStrengthColor(passwordStrength.score)
                            : 'bg-gray-200'
                        )}
                      />
                    ))}
                  </div>

                  {/* Password Requirements */}
                  <div className="grid grid-cols-1 gap-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={cn('flex items-center gap-1', passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-500')}>
                        {passwordStrength.hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        At least 8 characters
                      </div>
                      <div className={cn('flex items-center gap-1', passwordStrength.hasLowercase ? 'text-green-600' : 'text-gray-500')}>
                        {passwordStrength.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Lowercase letter
                      </div>
                      <div className={cn('flex items-center gap-1', passwordStrength.hasUppercase ? 'text-green-600' : 'text-gray-500')}>
                        {passwordStrength.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Uppercase letter
                      </div>
                      <div className={cn('flex items-center gap-1', passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500')}>
                        {passwordStrength.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Number
                      </div>
                      <div className={cn('flex items-center gap-1 sm:col-span-2', passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500')}>
                        {passwordStrength.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        Special character (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                  className={cn(
                    'pr-10 transition-all',
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500' :
                    watchedFields.confirmPassword && watchedFields.password === watchedFields.confirmPassword
                      ? 'border-green-500 focus:border-green-500' : ''
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.confirmPassword.message}
                </p>
              )}
              {!errors.confirmPassword && watchedFields.confirmPassword && watchedFields.password === watchedFields.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms and Privacy */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  Privacy Policy
                </Link>. We respect your privacy and will never share your personal information.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || passwordStrength.score < 3}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating your account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Create My Adventure Account
                </div>
              )}
            </Button>

            {passwordStrength.score < 3 && watchedFields.password && (
              <p className="text-xs text-center text-amber-600">
                Please create a stronger password to continue
              </p>
            )}

            <p className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}