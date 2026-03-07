'use client'

import { motion } from 'framer-motion'
import { MapPin, Camera, Globe, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import Image from 'next/image'
import Link from 'next/link'

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

interface PublicAlbum {
  id: string
  title: string
  cover_photo_url: string | null
  location_name: string | null
  country_code: string | null
  date_start: string | null
  created_at: string
}

interface PublicUser {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: string | null
}

interface PublicProfileContentProps {
  user: PublicUser
  albums: PublicAlbum[]
  countryCodes: string[]
  followerCount: number
}

export function PublicProfileContent({
  user,
  albums,
  countryCodes,
  followerCount,
}: PublicProfileContentProps) {
  const displayName = user.display_name || user.username
  const isPrivate = user.privacy_level === 'private'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero section */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-teal-100">
          <AvatarImage src={getPhotoUrl(user.avatar_url) || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName}</h1>
        <p className="text-gray-500 mb-3">@{user.username}</p>

        {user.bio && (
          <p className="text-gray-600 max-w-md mx-auto mb-4">{user.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{albums.length}</p>
            <p className="text-xs text-gray-500">Adventures</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">{countryCodes.length}</p>
            <p className="text-xs text-gray-500">Countries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{followerCount}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </div>
        </div>

        {/* Country flags */}
        {countryCodes.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {countryCodes.slice(0, 20).map(code => (
              <span key={code} className="text-2xl" title={code}>
                {countryCodeToFlag(code)}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link href="/signup">
          <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 rounded-xl">
            Join Adventure Log
          </Button>
        </Link>
      </motion.div>

      {/* Albums grid */}
      {isPrivate ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">This account is private</p>
          <p className="text-gray-400 text-sm mt-1">Follow to see their adventures</p>
        </div>
      ) : albums.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-teal-500" />
            Adventures
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {albums.map((album, i) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/albums/${album.id}/public`}>
                  <div className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                    {album.cover_photo_url ? (
                      <Image
                        src={getPhotoUrl(album.cover_photo_url) || ''}
                        alt={album.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-sm font-semibold truncate">{album.title}</p>
                      {album.location_name && (
                        <p className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {album.location_name.split(',')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Globe className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No public adventures yet</p>
        </div>
      )}

      {/* Footer branding */}
      <div className="text-center mt-12 py-6 border-t border-gray-100">
        <p className="text-sm text-gray-400">
          Powered by{' '}
          <Link href="/" className="text-teal-500 hover:text-teal-600 font-medium">
            Adventure Log
          </Link>
        </p>
      </div>
    </div>
  )
}
