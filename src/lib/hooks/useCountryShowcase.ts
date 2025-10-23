'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

export interface CountryAlbum {
  id: string
  title: string
  cover_image_url?: string
  cover_photo_x_offset?: number
  cover_photo_y_offset?: number
  user_id: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  likes_count: number
  comments_count: number
}

export interface CountryShowcase {
  country_code: string
  country_name: string
  album_count: number
  total_likes: number
  albums: CountryAlbum[]
}

interface UseCountryShowcaseReturn {
  countries: CountryShowcase[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

export function useCountryShowcase(): UseCountryShowcaseReturn {
  const [countries, setCountries] = useState<CountryShowcase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchCountryShowcase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate current month date range
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Fetch albums with location data (country_code OR location_name)
      // Only from current month
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          cover_photo_url,
          cover_photo_x_offset,
          cover_photo_y_offset,
          country_code,
          location_name,
          user_id,
          users!albums_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .not('location_name', 'is', null) // Changed: Only require location_name
        .eq('visibility', 'public')
        .neq('status', 'draft')
        .gte('created_at', firstDayOfMonth.toISOString()) // Filter to current month only
        .order('created_at', { ascending: false })
        .limit(200) // Fetch top 200 recent albums with location data

      if (albumsError) throw albumsError

      if (!albums || albums.length === 0) {
        setCountries([])
        setLoading(false)
        return
      }

      // Get album IDs for batch querying likes and comments
      const albumIds = albums.map(a => a.id)

      // Batch fetch likes counts (skip if no albums)
      let likesData: { target_id: string }[] | null = null
      if (albumIds.length > 0) {
        const { data } = await supabase
          .from('likes')
          .select('target_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds)
        likesData = data
      }

      // Batch fetch comments counts (skip if no albums)
      let commentsData: { target_id: string }[] | null = null
      if (albumIds.length > 0) {
        const { data } = await supabase
          .from('comments')
          .select('target_id')
          .eq('target_type', 'album')
          .in('target_id', albumIds)
        commentsData = data
      }

      // Create maps for efficient lookup
      const likesMap = new Map<string, number>()
      const commentsMap = new Map<string, number>()

      likesData?.forEach(like => {
        likesMap.set(like.target_id, (likesMap.get(like.target_id) || 0) + 1)
      })

      commentsData?.forEach(comment => {
        commentsMap.set(comment.target_id, (commentsMap.get(comment.target_id) || 0) + 1)
      })

      // Group albums by country
      const countryMap = new Map<string, {
        country_code: string
        albums: CountryAlbum[]
        total_likes: number
      }>()

      albums.forEach(album => {
        // Extract country: use country_code if available, otherwise extract from location_name
        let countryIdentifier = album.country_code

        if (!countryIdentifier && album.location_name) {
          // Extract country from location_name (usually last part after comma)
          // e.g. "Ibiza, Balearic Islands, Spain" -> "Spain"
          const parts = album.location_name.split(',').map((p: string) => p.trim())
          if (parts.length > 0) {
            countryIdentifier = parts[parts.length - 1]
          }
        }

        // Skip albums without any country information
        if (!countryIdentifier) return

        const user = Array.isArray(album.users) ? album.users[0] : album.users
        if (!user) return

        const likes_count = likesMap.get(album.id) || 0
        const comments_count = commentsMap.get(album.id) || 0

        const countryAlbum: CountryAlbum = {
          id: album.id,
          title: album.title,
          cover_image_url: album.cover_photo_url
            ? supabase.storage.from('photos').getPublicUrl(album.cover_photo_url).data.publicUrl
            : undefined,
          cover_photo_x_offset: album.cover_photo_x_offset,
          cover_photo_y_offset: album.cover_photo_y_offset,
          user_id: album.user_id,
          user: {
            id: user.id,
            username: user.username || 'anonymous',
            display_name: user.display_name || user.username || 'Anonymous',
            avatar_url: user.avatar_url
          },
          likes_count,
          comments_count
        }

        if (!countryMap.has(countryIdentifier)) {
          countryMap.set(countryIdentifier, {
            country_code: countryIdentifier,
            albums: [],
            total_likes: 0
          })
        }

        const country = countryMap.get(countryIdentifier)!
        country.albums.push(countryAlbum)
        country.total_likes += likes_count
      })

      // Convert map to array and sort by popularity
      const countriesArray: CountryShowcase[] = Array.from(countryMap.values())
        .map(country => ({
          country_code: country.country_code,
          country_name: getCountryName(country.country_code),
          album_count: country.albums.length,
          total_likes: country.total_likes,
          albums: country.albums
            .sort((a, b) => b.likes_count - a.likes_count) // Sort albums within country by likes
            .slice(0, 5) // Take top 5 most liked albums per country
        }))
        .sort((a, b) => {
          // Sort countries by: total likes desc, then album count desc
          if (b.total_likes !== a.total_likes) {
            return b.total_likes - a.total_likes
          }
          return b.album_count - a.album_count
        })
        .slice(0, 20) // Show top 20 countries

      setCountries(countriesArray)
      setLoading(false)

      log.info('Country showcase data loaded', {
        component: 'useCountryShowcase',
        countriesCount: countriesArray.length,
        totalAlbums: countriesArray.reduce((sum, c) => sum + c.album_count, 0)
      })
    } catch (err) {
      log.error('Error fetching country showcase',
        { component: 'useCountryShowcase' },
        err instanceof Error ? err : new Error(String(err))
      )
      setError(err instanceof Error ? err.message : 'Failed to load country showcase')
      setLoading(false)
    }
  }, [supabase])

  const refreshData = useCallback(async () => {
    await fetchCountryShowcase()
  }, [fetchCountryShowcase])

  useEffect(() => {
    fetchCountryShowcase()
  }, [fetchCountryShowcase])

  return {
    countries,
    loading,
    error,
    refreshData
  }
}

// Country code to name mapping (common countries)
function getCountryName(code: string): string {
  const countryNames: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    FR: 'France',
    DE: 'Germany',
    IT: 'Italy',
    ES: 'Spain',
    JP: 'Japan',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    MX: 'Mexico',
    NL: 'Netherlands',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    CH: 'Switzerland',
    AT: 'Austria',
    BE: 'Belgium',
    PT: 'Portugal',
    GR: 'Greece',
    TR: 'Turkey',
    RU: 'Russia',
    PL: 'Poland',
    CZ: 'Czech Republic',
    IE: 'Ireland',
    NZ: 'New Zealand',
    SG: 'Singapore',
    TH: 'Thailand',
    VN: 'Vietnam',
    KR: 'South Korea',
    ID: 'Indonesia',
    MY: 'Malaysia',
    PH: 'Philippines',
    ZA: 'South Africa',
    EG: 'Egypt',
    MA: 'Morocco',
    KE: 'Kenya',
    AR: 'Argentina',
    CL: 'Chile',
    PE: 'Peru',
    CO: 'Colombia',
    CR: 'Costa Rica',
    IS: 'Iceland',
    HR: 'Croatia',
    SI: 'Slovenia',
    HU: 'Hungary',
    RO: 'Romania',
    BG: 'Bulgaria',
    UA: 'Ukraine',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    IL: 'Israel',
    JO: 'Jordan',
    LB: 'Lebanon',
    OM: 'Oman',
    QA: 'Qatar',
    KW: 'Kuwait',
    BH: 'Bahrain'
  }

  // Normalize the code to uppercase for lookup
  const normalizedCode = code.toUpperCase()

  // Direct match
  if (countryNames[normalizedCode]) {
    return countryNames[normalizedCode]
  }

  // Handle full country names being used as codes (e.g., "INDIA" instead of "IN")
  const nameToCode: Record<string, string> = {
    'INDIA': 'India',
    'SPAIN': 'Spain',
    'GERMANY': 'Germany',
    'FRANCE': 'France',
    'PORTUGAL': 'Portugal'
  }

  if (nameToCode[normalizedCode]) {
    return nameToCode[normalizedCode]
  }

  // If it's a long name (more than 2 chars), return it capitalized
  if (code.length > 2) {
    return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase()
  }

  // Default: return uppercase code
  return normalizedCode
}
