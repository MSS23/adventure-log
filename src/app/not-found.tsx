'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Compass, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: 'var(--color-forest)', boxShadow: '0 8px 24px rgba(74,93,35,0.28)' }}
        >
          <Compass className="h-7 w-7 text-white" />
        </div>

        <p className="al-eyebrow mb-3">Error 404</p>
        <h1 className="al-display text-6xl mb-3" style={{ color: 'var(--color-forest)' }}>
          404
        </h1>
        <p className="font-heading text-lg font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
          Trail not found
        </p>
        <p className="al-body mb-8">
          This path doesn&apos;t lead anywhere. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col gap-2.5">
          <Button
            asChild
            variant="coral"
            className="w-full h-11 font-semibold cursor-pointer"
          >
            <Link href="/discover">
              <Search className="h-4 w-4 mr-2" />
              Explore the Globe
            </Link>
          </Button>
          <div className="flex gap-2.5">
            <Button
              asChild
              variant="outline"
              className="flex-1 h-11 rounded-xl cursor-pointer"
            >
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl cursor-pointer"
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
