'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to profile page since dashboard is now merged with profile
    router.replace('/profile')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-gray-600">
        Redirecting to profile...
      </div>
    </div>
  )
}
