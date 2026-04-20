'use client'

import { useMemo, useState } from 'react'
import { X, Image as ImageIcon, MapPin, Calendar, Sparkles } from 'lucide-react'

interface Photo {
  id: string
  file_path?: string | null
  latitude?: number | null
  longitude?: number | null
  taken_at?: string | null
  caption?: string | null
}

interface Album {
  id: string
  title?: string | null
  description?: string | null
  cover_photo_url?: string | null
  cover_image_url?: string | null
  location_name?: string | null
  country_code?: string | null
  latitude?: number | null
  longitude?: number | null
  date_start?: string | null
  start_date?: string | null
}

interface Nudge {
  key: string
  icon: React.ReactNode
  text: string
  action?: string
}

interface Props {
  album: Album
  photos: Photo[]
  isOwner: boolean
}

/**
 * Owner-only dismissible card that surfaces gaps: no cover, photos without
 * geotags, missing date, short caption/description, unset location.
 * Silent when the album is already in great shape.
 */
export function AlbumQualityNudges({ album, photos, isOwner }: Props) {
  const [dismissed, setDismissed] = useState(false)

  const nudges = useMemo<Nudge[]>(() => {
    if (!isOwner) return []
    const list: Nudge[] = []

    // No cover photo
    if (!album.cover_photo_url && !album.cover_image_url && photos.length > 0) {
      list.push({
        key: 'cover',
        icon: <ImageIcon className="h-4 w-4" />,
        text: 'Set a cover photo — the globe and feed look much better with one.',
      })
    }

    // Missing location data
    if (!album.location_name && (!album.latitude || !album.longitude)) {
      list.push({
        key: 'location',
        icon: <MapPin className="h-4 w-4" />,
        text: "Add a location so this album appears on your globe.",
      })
    } else if (album.location_name && !album.country_code) {
      list.push({
        key: 'country',
        icon: <MapPin className="h-4 w-4" />,
        text: "Tag a country code so this counts toward your passport.",
      })
    }

    // No date
    if (!album.date_start && !album.start_date) {
      list.push({
        key: 'date',
        icon: <Calendar className="h-4 w-4" />,
        text: "When did this trip happen? Dates power your timeline and Wrapped.",
      })
    }

    // Photos missing geotags
    if (photos.length >= 3) {
      const missingGeo = photos.filter((p) => !p.latitude || !p.longitude).length
      const ratio = missingGeo / photos.length
      if (ratio >= 0.4 && missingGeo >= 3) {
        list.push({
          key: 'geotags',
          icon: <MapPin className="h-4 w-4" />,
          text: `${missingGeo} of ${photos.length} photos have no GPS — try our EXIF re-reader.`,
        })
      }
    }

    // No description / caption on any photo
    const capturedCaptions = photos.filter((p) => p.caption && p.caption.trim().length > 0).length
    if (photos.length >= 5 && capturedCaptions === 0 && !album.description) {
      list.push({
        key: 'story',
        icon: <Sparkles className="h-4 w-4" />,
        text: "Add a short description — even one sentence makes albums feel like stories.",
      })
    }

    return list
  }, [album, photos, isOwner])

  if (dismissed || nudges.length === 0) return null

  return (
    <div
      className="relative rounded-2xl p-5 mb-5"
      style={{
        background: 'var(--color-gold-tint)',
        border: '1px solid var(--color-gold)',
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/40 transition-colors"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4" style={{ color: 'var(--color-gold)' }} />
        <p className="al-eyebrow">Polish this album</p>
      </div>

      <ul className="space-y-2">
        {nudges.map((n) => (
          <li
            key={n.key}
            className="flex items-start gap-2.5 text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            <span
              className="flex-shrink-0 mt-0.5"
              style={{ color: 'var(--color-gold)' }}
            >
              {n.icon}
            </span>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
