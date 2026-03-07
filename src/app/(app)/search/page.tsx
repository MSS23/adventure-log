'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Redirect to explore page with the same query params
    const query = searchParams.get('q')
    if (query) {
      router.replace(`/explore?q=${encodeURIComponent(query)}`)
    } else {
      router.replace('/explore')
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Redirecting to explore...</p>
    </div>
  )
}
