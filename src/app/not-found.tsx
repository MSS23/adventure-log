'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Compass, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F7F0] dark:bg-black flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-olive-700 rounded-2xl flex items-center justify-center shadow-lg shadow-olive-700/20 mx-auto mb-6">
          <Compass className="h-7 w-7 text-white" />
        </div>

        <h1 className="text-6xl font-bold text-olive-700 dark:text-olive-400 mb-2">404</h1>
        <p className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-1">
          Trail not found
        </p>
        <p className="text-sm text-olive-600 dark:text-olive-400 mb-8">
          This path doesn&apos;t lead anywhere. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button asChild className="w-full h-11 bg-olive-700 hover:bg-olive-800 text-white font-semibold rounded-xl shadow-lg shadow-olive-700/20">
            <Link href="/explore">
              <Search className="h-4 w-4 mr-2" />
              Explore Adventures
            </Link>
          </Button>
          <div className="flex gap-2.5">
            <Button asChild variant="outline" className="flex-1 h-11 rounded-xl border-olive-200 dark:border-white/[0.1] text-olive-700 dark:text-olive-300">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-olive-200 dark:border-white/[0.1] text-olive-700 dark:text-olive-300"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
