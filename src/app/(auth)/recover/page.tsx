'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCcw, CheckCircle, XCircle, Loader2, ArrowLeft, Compass, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'
import { log } from '@/lib/utils/logger'

export default function RecoverAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    id: string
    email: string
    deletedAt: string
    daysRemaining: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const checkDeletedAccount = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Please log in to recover your account')
        setLoading(false)
        return
      }

      const { data: userData, error: queryError } = await supabase
        .from('users')
        .select('id, email, deleted_at')
        .eq('id', user.id)
        .single()

      if (queryError) {
        log.error('Error checking deleted account', { userId: user.id }, queryError)
        setError('Failed to check account status')
        setLoading(false)
        return
      }

      if (!userData.deleted_at) {
        router.push('/profile')
        return
      }

      const deletedDate = new Date(userData.deleted_at)
      const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const now = new Date()
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      if (daysRemaining <= 0) {
        setError('Recovery period has expired. Your account cannot be restored.')
        setLoading(false)
        return
      }

      setUserInfo({
        id: userData.id,
        email: userData.email,
        deletedAt: userData.deleted_at,
        daysRemaining
      })

    } catch (err) {
      log.error('Error in checkDeletedAccount', {}, err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDeletedAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRecover = async () => {
    if (!userInfo) return

    try {
      setRecovering(true)
      setError(null)

      const { error: restoreError } = await supabase
        .rpc('restore_user_account', { user_id_param: userInfo.id })

      if (restoreError) {
        log.error('Error restoring account', { userId: userInfo.id }, restoreError)
        throw restoreError
      }

      log.info('Account restored successfully', { userId: userInfo.id })
      setSuccess(true)

      setTimeout(() => {
        router.push('/profile')
      }, 2000)

    } catch (err) {
      log.error('Error recovering account', {}, err)
      setError(err instanceof Error ? err.message : 'Failed to recover account')
    } finally {
      setRecovering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4">
        <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-3">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Account recovered
            </CardTitle>
            <CardDescription className="text-olive-600 dark:text-olive-400">
              Welcome back! All your data has been restored. Redirecting to your profile...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error && !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border-olive-200/50 dark:border-white/[0.06] dark:bg-[#111111] rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-3">
              <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-olive-950 dark:text-olive-50">
              Cannot recover account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button asChild variant="outline" className="w-full h-12 cursor-pointer transition-all duration-200 active:scale-[0.97] rounded-xl border-olive-200 dark:border-white/[0.08] text-olive-700 dark:text-olive-300 hover:bg-olive-50 dark:hover:bg-white/[0.04]">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

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
            Recover your account
          </CardTitle>
          <CardDescription className="text-center text-olive-600 dark:text-olive-400">
            Your account was scheduled for deletion
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {userInfo && (
            <>
              <div className="bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-700/30 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-olive-600 dark:text-olive-400 uppercase tracking-wide font-medium">Account</p>
                  <p className="font-medium text-olive-900 dark:text-olive-100">{userInfo.email}</p>
                </div>
                <div>
                  <p className="text-xs text-olive-600 dark:text-olive-400 uppercase tracking-wide font-medium">Deleted on</p>
                  <p className="font-medium text-olive-900 dark:text-olive-100">
                    {new Date(userInfo.deletedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-olive-600 dark:text-olive-400 uppercase tracking-wide font-medium">Time remaining to recover</p>
                  <p className="text-2xl font-bold text-olive-700 dark:text-olive-300">
                    {userInfo.daysRemaining} {userInfo.daysRemaining === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* What gets restored */}
              <div className="space-y-2 text-sm text-olive-700 dark:text-olive-300">
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  All your albums and photos will be restored
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  Your friends and followers will be restored
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  All settings will remain unchanged
                </p>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleRecover}
            disabled={recovering}
            className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-semibold text-base shadow-lg shadow-olive-700/20 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {recovering ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recovering account...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Recover My Account
              </span>
            )}
          </Button>

          <Link href="/login" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 cursor-pointer transition-all duration-200 active:scale-[0.97] rounded-xl border-olive-200 dark:border-white/[0.08] text-olive-700 dark:text-olive-300 hover:bg-olive-50 dark:hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
