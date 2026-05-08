'use client'

import { Star, X, Check, Loader2 } from 'lucide-react'

interface WishlistPromptData {
  lat: number
  lng: number
  screenX: number
  screenY: number
  locationName: string | null
  loading: boolean
  adding: boolean
}

interface GlobeWishlistPromptProps {
  prompt: WishlistPromptData
  onConfirm: () => void
  onDismiss: () => void
}

export function GlobeWishlistPrompt({ prompt, onConfirm, onDismiss }: GlobeWishlistPromptProps) {
  return (
    <div
      className="absolute z-30 animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: Math.min(prompt.screenX, (typeof window !== 'undefined' ? window.innerWidth - 260 : 300)),
        top: Math.min(prompt.screenY - 80, (typeof window !== 'undefined' ? window.innerHeight - 160 : 300)),
      }}
    >
      <div className="bg-black/70 backdrop-blur-xl rounded-xl border border-amber-500/30 p-3 w-56 shadow-2xl shadow-amber-500/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-amber-300">Add to Wishlist?</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {prompt.loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="text-xs text-white/60">Finding location...</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/80 mb-2.5 line-clamp-2 leading-relaxed">
              {prompt.locationName}
            </p>
            <button
              onClick={onConfirm}
              disabled={prompt.adding}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors duration-200 disabled:opacity-50 cursor-pointer active:scale-[0.97] min-h-[36px]"
            >
              {prompt.adding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {prompt.adding ? 'Adding...' : 'Add Destination'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
