import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import DashboardContent from './DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-olive-50/50 dark:bg-olive-950/20 border border-olive-200/50 dark:border-olive-800/30 rounded-2xl p-8 text-center">
          <p className="text-olive-700 dark:text-olive-300 font-medium">Profile not found</p>
          <p className="text-olive-600/70 dark:text-olive-400/70 text-sm mt-1">Please complete your profile setup</p>
          <Link href="/setup" className="mt-5 inline-block cursor-pointer">
            <Button className="cursor-pointer active:scale-[0.97] transition-all duration-200">Complete Profile Setup</Button>
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
      .eq('user_id', user.id),
    supabase
      .from('photos')
      .select('id')
      .eq('user_id', user.id),
    supabase
      .from('albums')
      .select('id, title, cover_photo_url, location_name, country_code, date_start, created_at, status')
      .eq('user_id', user.id)
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
    photos: photosResult.data?.length || 0,
    countries: uniqueCountries.size,
    cities: uniqueCities.size
  }

  const initialRecentAlbums = (recentAlbumsResult.data || []).filter(a => a.status !== 'draft')

  return (
    <DashboardContent
      profile={profile}
      userId={user.id}
      initialStats={initialStats}
      initialRecentAlbums={initialRecentAlbums}
    />
  )
}
