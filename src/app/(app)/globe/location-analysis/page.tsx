'use client'

import { AlbumLocationAnalysis } from '@/components/globe/AlbumLocationAnalysis'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Globe } from 'lucide-react'
import Link from 'next/link'

export default function AlbumLocationAnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/globe">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Globe
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-7 w-7 text-blue-600" />
            Album Location Analysis
          </h1>
          <p className="text-gray-600">
            Understand which albums have location data and will appear on the globe
          </p>
        </div>
      </div>

      {/* Analysis Component */}
      <AlbumLocationAnalysis />
    </div>
  )
}