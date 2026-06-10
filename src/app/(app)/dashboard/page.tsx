import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import DashboardContent from './DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-heading text-base md:text-lg font-semibold text-foreground">Profile not found</p>
          <p className="mt-1 text-sm text-muted-foreground">Please complete your profile setup</p>
          <Link href="/setup" className="mt-5 inline-block cursor-pointer">
            <Button className="cursor-pointer">Complete Profile Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Fetch stats and recent albums in parallel
  const [albumsResult, photosResult, recentAlbumsResult] = await Promise.all([
    supabase
      .from('albums')
      .select('id, country_code, location_name, latitude, longitude, status')
      .eq('user_id', userId),
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('albums')
      .select('id, title, cover_photo_url, location_name, country_code, date_start, created_at, status')
      .eq('user_id', userId)
      .order('date_start', { ascending: false, nullsFirst: false })
      .limit(6)
  ])

  const albums = (albumsResult.data || []).filter(a => a.status !== 'draft')
  const albumsWithLocation = albums.filter(a => a.latitude && a.longitude)

  const uniqueCountries = new Set(
    albumsWithLocation
      .filter(a => a.country_code || a.location_name)
      .map(a => {
        if (a.country_code) return a.country_code
        if (a.location_name) {
          const parts = a.location_name.split(',').map((p: string) => p.trim())
          return parts[parts.length - 1] || ''
        }
        return ''
      })
      .filter(country => country.length > 0)
  )

  const uniqueCities = new Set(
    albumsWithLocation
      .filter(a => a.location_name)
      .map(a => {
        const parts = a.location_name.split(',').map((p: string) => p.trim())
        return parts[0] || a.location_name
      })
  )

  const initialStats = {
    albums: albums.length,
    photos: photosResult.count || 0,
    countries: uniqueCountries.size,
    cities: uniqueCities.size
  }

  const initialRecentAlbums = (recentAlbumsResult.data || []).filter(a => a.status !== 'draft')

  return (
    <DashboardContent
      profile={profile}
      userId={userId}
      initialStats={initialStats}
      initialRecentAlbums={initialRecentAlbums}
    />
  )
}
