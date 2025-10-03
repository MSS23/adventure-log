'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCcw, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
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

  useEffect(() => {
    checkDeletedAccount()
  }, [])

  const checkDeletedAccount = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Please log in to recover your account')
        setLoading(false)
        return
      }

      // Check if user account is deleted
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
        // Account is not deleted, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Calculate days remaining
      const deletedDate = new Date(userData.deleted_at)
      const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
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

  const handleRecover = async () => {
    if (!userInfo) return

    try {
      setRecovering(true)
      setError(null)

      // Call the restore function
      const { error: restoreError } = await supabase
        .rpc('restore_user_account', { user_id_param: userInfo.id })

      if (restoreError) {
        log.error('Error restoring account', { userId: userInfo.id }, restoreError)
        throw restoreError
      }

      log.info('Account restored successfully', { userId: userInfo.id })
      setSuccess(true)

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Checking account status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <CardTitle className="text-green-600">Account Recovered!</CardTitle>
            </div>
            <CardDescription>
              Your account has been successfully restored
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Welcome back! All your data has been restored. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <CardTitle className="text-red-600">Cannot Recover Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-8 w-8 text-orange-600" />
            <div>
              <CardTitle>Recover Your Account</CardTitle>
              <CardDescription>
                Your account was scheduled for deletion
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {userInfo && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Account</p>
                  <p className="font-medium">{userInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deleted on</p>
                  <p className="font-medium">
                    {new Date(userInfo.deletedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time remaining to recover</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {userInfo.daysRemaining} {userInfo.daysRemaining === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleRecover}
                  disabled={recovering}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {recovering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recovering Account...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Recover My Account
                    </>
                  )}
                </Button>

                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>

              <div className="text-sm text-gray-500 space-y-2">
                <p>✓ All your albums and photos will be restored</p>
                <p>✓ Your friends and followers will be restored</p>
                <p>✓ All settings will remain unchanged</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
