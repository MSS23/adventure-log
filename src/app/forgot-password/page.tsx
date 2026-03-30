'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2, Compass } from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw error
      }

      setSent(true)
      log.info('Password reset email sent', {
        component: 'ForgotPasswordPage',
        action: 'resetPassword',
        email
      })
    } catch (err) {
      log.error('Password reset failed', {
        component: 'ForgotPasswordPage',
        action: 'resetPassword',
        email
      }, err instanceof Error ? err : new Error(String(err)))

      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Check your email
            </CardTitle>
            <CardDescription className="text-olive-600 dark:text-olive-400">
              We&apos;ve sent a password reset link to <strong className="text-olive-800 dark:text-olive-200">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-700/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                <p className="text-sm text-olive-700 dark:text-olive-300">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
              variant="outline"
              className="w-full h-12 cursor-pointer transition-all duration-200 active:scale-[0.97] rounded-xl border-olive-200 dark:border-white/[0.08] text-olive-700 dark:text-olive-300 hover:bg-olive-50 dark:hover:bg-white/[0.04]"
            >
              Send another email
            </Button>

            <Button asChild className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20 transition-all duration-200 cursor-pointer active:scale-[0.97]">
              <Link href="/login">Back to Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

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
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Enter your email and we&apos;ll send you a link to reset your password
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
              <Label htmlFor="email" className="text-olive-800 dark:text-olive-200">Email Address</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={loading}
                className={`text-base focus-visible:ring-2 focus-visible:ring-olive-500 ${error ? 'border-red-500' : ''}`}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold text-base shadow-lg shadow-olive-700/20 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !email}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Reset Link
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
