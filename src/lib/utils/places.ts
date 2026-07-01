/**
 * Helpers for turning a free-text album location (e.g. "Paris, France") into a
 * stable, URL-safe key used to group albums into "places" and to build the
 * per-location feed routes at /places/[slug].
 *
 * There is no dedicated `places` table — albums store a human-readable
 * `location_name` plus optional coordinates. We derive a canonical slug from
 * the location name so that every album sharing the same place lands on the
 * same location page.
 */

/**
 * Convert an arbitrary string into a lowercase, hyphenated, ASCII-ish slug.
 * Diacritics are stripped so "Málaga, España" and "Malaga, Espana" collide.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 120)
}

/**
 * The canonical slug for an album location. Returns null when there's no usable
 * location name (empty or slug reduces to nothing).
 */
export function placeSlug(locationName: string | null | undefined): string | null {
  if (!locationName) return null
  const slug = slugify(locationName)
  return slug.length > 0 ? slug : null
}

/**
 * A loose free-text search term derived from a slug, suitable for a PostgREST
 * `ilike` pre-filter. We can't perfectly reverse a slug back to the original
 * text, so we take the first meaningful token and let the caller re-filter
 * precisely by comparing `placeSlug(location_name) === slug` in JS.
 */
export function slugSearchTerm(slug: string): string {
  const firstToken = slug.split('-').filter(Boolean)[0] || slug
  return firstToken
}

/**
 * Minimal shape a place needs from an album to be grouped/displayed.
 */
export interface PlaceAlbumInput {
  id: string
  user_id: string
  title: string
  cover_photo_url?: string | null
  location_name?: string | null
  country_code?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at: string
  date_start?: string | null
  start_date?: string | null
}

export interface PlaceGroup {
  slug: string
  name: string
  country_code: string | null
  latitude: number | null
  longitude: number | null
  albumCount: number
  contributorIds: string[]
  coverPhotoUrl: string | null
  latestDate: string
  albums: PlaceAlbumInput[]
}

/**
 * Group a flat list of albums into places keyed by their location slug.
 * Albums without a usable location name are dropped. Groups are sorted by most
 * recent activity first.
 */
export function groupAlbumsByPlace(albums: PlaceAlbumInput[]): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>()

  for (const album of albums) {
    const slug = placeSlug(album.location_name)
    if (!slug) continue

    const activityDate = album.date_start || album.start_date || album.created_at
    const existing = groups.get(slug)

    if (existing) {
      existing.albums.push(album)
      existing.albumCount += 1
      if (!existing.contributorIds.includes(album.user_id)) {
        existing.contributorIds.push(album.user_id)
      }
      if (!existing.coverPhotoUrl && album.cover_photo_url) {
        existing.coverPhotoUrl = album.cover_photo_url
      }
      if (!existing.country_code && album.country_code) {
        existing.country_code = album.country_code
      }
      if (existing.latitude == null && album.latitude != null) {
        existing.latitude = album.latitude
        existing.longitude = album.longitude ?? null
      }
      if (new Date(activityDate).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestDate = activityDate
      }
    } else {
      groups.set(slug, {
        slug,
        name: album.location_name as string,
        country_code: album.country_code ?? null,
        latitude: album.latitude ?? null,
        longitude: album.longitude ?? null,
        albumCount: 1,
        contributorIds: [album.user_id],
        coverPhotoUrl: album.cover_photo_url ?? null,
        latestDate: activityDate,
        albums: [album],
      })
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  )
}
