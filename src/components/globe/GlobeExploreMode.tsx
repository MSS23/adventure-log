'use client'

import { Camera, Loader2, Compass, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ExploreAlbum {
  id: string
  title: string
  cover_photo_url?: string
  location_name?: string
  user_id: string
  owner?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface GlobeExploreModeProps {
  exploreAlbums: ExploreAlbum[]
  exploreLoading: boolean
  exploreStats: { travelers: number; albums: number }
}

/** Explore mode filmstrip shown at the bottom of the globe */
export function GlobeExploreStrip({
  exploreAlbums,
  exploreLoading,
  exploreStats,
}: GlobeExploreModeProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[1200px] bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] px-3 py-2.5 z-10 shadow-2xl">
      {exploreLoading ? (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-4 w-4 text-olive-400 animate-spin" />
          <span className="text-xs text-white/50">Discovering travelers worldwide...</span>
        </div>
      ) : exploreAlbums.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-3">
          <Compass className="h-4 w-4 text-white/30" />
          <span className="text-xs text-white/50">No public albums found yet. Be the first to share!</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-2 px-0.5">
            <Compass className="h-3 w-3 text-olive-400/70" />
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Community</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {exploreAlbums.map((album) => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="flex-shrink-0 w-[64px] sm:w-[80px] md:w-[96px] rounded-lg overflow-hidden transition-all duration-200 hover:ring-1 hover:ring-olive-400/40 opacity-90 hover:opacity-100 group cursor-pointer hover:shadow-lg"
              >
                <div className="relative aspect-[3/4] bg-gradient-to-br from-stone-700 to-stone-800">
                  {album.cover_photo_url ? (
                    <Image
                      src={getPhotoUrl(album.cover_photo_url) || ''}
                      alt={album.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive-900/40 to-stone-800">
                      <Camera className="h-5 w-5 text-olive-400/50" />
                    </div>
                  )}
                  {/* User avatar overlay */}
                  {album.owner && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <Avatar className="h-5 w-5 ring-1 ring-black/40 shadow-md">
                        <AvatarImage
                          src={getPhotoUrl(album.owner.avatar_url, 'avatars') || ''}
                          alt={album.owner.display_name}
                        />
                        <AvatarFallback className="text-[7px] bg-olive-600 text-white">
                          {(album.owner.display_name || album.owner.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1.5">
                      <p className="text-[9px] md:text-[10px] font-semibold text-white line-clamp-1 drop-shadow-lg leading-tight">
                        {album.title}
                      </p>
                      {album.owner && (
                        <p className="text-[8px] text-white/50 line-clamp-1 mt-0.5">
                          @{album.owner.username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Mobile explore stats indicator */
export function GlobeExploreStatsIndicator({
  exploreStats,
}: {
  exploreStats: { travelers: number; albums: number }
}) {
  return (
    <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-black/50 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/10 shadow-lg flex items-center gap-2">
        <Users className="h-3 w-3 text-olive-400" />
        <span className="text-[11px] font-medium text-white/80">
          {exploreStats.travelers} travelers, {exploreStats.albums} albums
        </span>
      </div>
    </div>
  )
}
