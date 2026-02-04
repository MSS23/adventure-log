'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe').then((mod) => mod.EnhancedGlobe),
  {
    ssr: false,
    loading: () => <GlobeLoadingState />
  }
)

function GlobeLoadingState() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-teal-500/30 border-t-teal-500"
        />
        <p className="text-white/60 text-sm">Loading your globe...</p>
      </div>
    </div>
  )
}

interface GlobeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function GlobeModal({ open, onOpenChange, userId }: GlobeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0
                   bg-gradient-to-br from-slate-900 to-slate-800
                   border-slate-700/50 overflow-hidden"
        showCloseButton={false}
      >
        {/* Hidden description for accessibility */}
        <DialogDescription className="sr-only">
          Interactive 3D globe showing your travel locations
        </DialogDescription>

        {/* Custom header overlay */}
        <div className="absolute top-0 left-0 right-0 z-50
                        flex items-center justify-between p-4
                        bg-gradient-to-b from-black/60 via-black/30 to-transparent">
          <DialogHeader className="flex-row items-center gap-3 space-y-0">
            <div className="p-2 rounded-xl bg-teal-500/20 backdrop-blur-sm border border-teal-500/30">
              <Globe className="h-5 w-5 text-teal-400" />
            </div>
            <DialogTitle className="text-white font-semibold text-lg">
              Your Travel Globe
            </DialogTitle>
          </DialogHeader>

          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        {/* Globe container */}
        <div className="w-full h-full">
          <EnhancedGlobe
            filterUserId={userId}
            hideHeader={true}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
