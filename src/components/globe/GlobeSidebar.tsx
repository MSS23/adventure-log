'use client'

import { MapPin, Camera, Calendar, X, ArrowRight, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import type { WishlistItem } from '@/lib/hooks/useWishlist'

interface AlbumPreview {
  id: string
  title: string
  cover_photo_url?: string
  location_name?: string
  country_code?: string
  latitude?: number
  longitude?: number
  created_at: string
  date_start?: string
  start_date?: string
  description?: string
}

function getCountryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

// --------------- Desktop Side Panel ---------------

interface GlobeSidePanelProps {
  album: AlbumPreview
  onClose: () => void
}

export function GlobeSidePanel({ album, onClose }: GlobeSidePanelProps) {
  const flag = album.country_code ? getCountryFlag(album.country_code) : null

  return (
    <div className="hidden md:flex flex-col w-[320px] flex-shrink-0 bg-black/80 backdrop-blur-xl border-l border-white/[0.08] animate-in slide-in-from-right-5 duration-300">
      {/* Cover image */}
      <div className="relative h-[200px] flex-shrink-0">
        {album.cover_photo_url ? (
          <Image
            src={getPhotoUrl(album.cover_photo_url) || ''}
            alt={album.title}
            fill
            className="object-cover"
            sizes="320px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-olive-900/60 to-stone-800 flex items-center justify-center">
            <Camera className="h-10 w-10 text-olive-400/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Title overlay on cover */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-semibold text-white mb-1">{album.title}</h3>
          {album.location_name && (
            <p className="text-sm text-white/60 flex items-center gap-1.5">
              {flag && <span className="text-base">{flag}</span>}
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{album.location_name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Album details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date */}
        {(album.date_start || album.start_date) && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{new Date(album.date_start || album.start_date || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}

        {/* Description */}
        {album.description && (
          <p className="text-sm text-white/70 leading-relaxed">{album.description}</p>
        )}
      </div>

      {/* View Album button pinned to bottom */}
      <div className="p-4 flex-shrink-0 border-t border-white/[0.06]">
        <Link
          href={`/albums/${album.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-olive-600 hover:bg-olive-500 text-white text-sm font-medium transition-colors duration-200 cursor-pointer active:scale-[0.97]"
        >
          View Album
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// --------------- Mobile Featured Album Card ---------------

interface MobileFeaturedAlbumProps {
  album: AlbumPreview
  onClose: () => void
}

export function MobileFeaturedAlbum({ album, onClose }: MobileFeaturedAlbumProps) {
  const flag = album.country_code ? getCountryFlag(album.country_code) : null

  return (
    <div className="md:hidden absolute bottom-[68px] left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-black/70 backdrop-blur-xl rounded-xl border border-white/[0.08] shadow-2xl px-3 py-2 flex items-center gap-2.5">
        {/* Thumbnail */}
        <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-800">
          {album.cover_photo_url ? (
            <Image
              src={getPhotoUrl(album.cover_photo_url) || ''}
              alt={album.title}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-4 w-4 text-olive-400/50" />
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-white truncate">{album.title}</h3>
          {album.location_name && (
            <p className="text-[10px] text-white/50 flex items-center gap-1 truncate">
              {flag && <span className="text-xs">{flag}</span>}
              <span className="truncate">{album.location_name.split(',')[0]}</span>
            </p>
          )}
        </div>
        {/* Actions */}
        <Link
          href={`/albums/${album.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-olive-600 hover:bg-olive-500 text-white text-[11px] font-medium transition-colors duration-200 flex-shrink-0 cursor-pointer active:scale-[0.97]"
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-200 flex-shrink-0 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// --------------- Album Filmstrip ---------------

interface GlobeAlbumFilmstripProps {
  albums: AlbumPreview[]
  selectedAlbumId: string | null
  onAlbumClick: (albumId: string) => void
  showWishlist: boolean
  wishlistItems: WishlistItem[]
  onWishlistItemClick: (item: WishlistItem) => void
}

export function GlobeAlbumFilmstrip({
  albums,
  selectedAlbumId,
  onAlbumClick,
  showWishlist,
  wishlistItems,
  onWishlistItemClick,
}: GlobeAlbumFilmstripProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] z-10">
      <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] px-2.5 py-2 shadow-2xl">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide items-center">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onAlbumClick(album.id)}
              className={cn(
                "flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500",
                selectedAlbumId === album.id
                  ? "w-[56px] sm:w-[68px] md:w-[80px] ring-2 ring-olive-400 shadow-lg shadow-olive-500/20"
                  : "w-[48px] sm:w-[56px] md:w-[64px] hover:ring-1 hover:ring-white/20 opacity-70 hover:opacity-100"
              )}
            >
              <div className="relative bg-gradient-to-br from-stone-700 to-stone-800 aspect-square">
                {album.cover_photo_url ? (
                  <Image
                    src={getPhotoUrl(album.cover_photo_url) || ''}
                    alt={album.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive-900/40 to-stone-800">
                    <Camera className="h-4 w-4 text-olive-400/50" />
                  </div>
                )}
                {selectedAlbumId !== album.id && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5">
                      <p className="text-[7px] sm:text-[8px] font-medium text-white/90 line-clamp-1 drop-shadow-lg leading-tight">
                        {album.title}
                      </p>
                    </div>
                  </div>
                )}
                {selectedAlbumId === album.id && (
                  <div className="absolute inset-0 ring-inset ring-2 ring-olive-400/50 rounded-lg" />
                )}
              </div>
            </button>
          ))}

          {/* Wishlist items */}
          {showWishlist && wishlistItems.length > 0 && (
            <>
              {albums.length > 0 && (
                <div className="flex-shrink-0 flex items-center px-0.5">
                  <div className="w-px h-8 bg-amber-400/20 rounded-full" />
                </div>
              )}
              {wishlistItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onWishlistItemClick(item)}
                  className="flex-shrink-0 w-[56px] md:w-[64px] rounded-lg overflow-hidden transition-all duration-200 hover:ring-1 hover:ring-amber-400/40 opacity-70 hover:opacity-100 group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-amber-900/50 to-amber-950/50 flex items-center justify-center">
                    <Star className="h-4 w-4 text-amber-400/60 fill-amber-400/20 group-hover:fill-amber-400/50 transition-colors" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 px-0.5 py-0.5">
                        <p className="text-[7px] font-medium text-amber-200/70 line-clamp-1 drop-shadow-lg leading-tight text-center">
                          {item.location_name.split(',')[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
