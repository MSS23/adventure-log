'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, RefreshCw, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return email

  const visibleChars = Math.min(2, localPart.length)
  const maskedLocal = localPart.slice(0, visibleChars) + '***'
  return `${maskedLocal}@${domain}`
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const supabase = createClient()

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return

    try {
      setResendLoading(true)
      setResendError(null)
      setResendSuccess(false)

      log.info('Resending verification email', { email })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      })

      if (error) {
        log.error('Failed to resend verification email', { error: error.message })

        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          setResendError('Too many attempts. Please wait a few minutes before trying again.')
        } else {
          setResendError(error.message)
        }
        return
      }

      log.info('Verification email resent successfully')
      setResendSuccess(true)
      setCooldown(60) // 60 second cooldown
    } catch (error) {
      log.error('Unexpected error resending email', { error })
      setResendError('Failed to send verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }, [email, cooldown, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader className="space-y-4 pb-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900">
            Verify your email
          </CardTitle>
          <CardDescription className="text-gray-600">
            We&apos;ve sent a verification link to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email display */}
          {email && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Sent to: <span className="font-medium text-gray-900">{maskEmail(email)}</span>
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-semibold">1.</span>
              Check your email inbox (and spam folder)
            </p>
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-semibold">2.</span>
              Click the verification link in the email
            </p>
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-semibold">3.</span>
              Complete your profile setup
            </p>
          </div>

          {/* Success message */}
          {resendSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Verification email sent! Please check your inbox.
              </p>
            </div>
          )}

          {/* Error message */}
          {resendError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{resendError}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          {/* Resend button */}
          {email && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading || cooldown > 0}
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
          )}

          {/* Back to login */}
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full text-gray-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
