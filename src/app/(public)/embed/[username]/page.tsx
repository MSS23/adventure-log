import { createClient } from '@/lib/supabase/server'
import { EmbedMapContent } from '@/components/embed/EmbedMapContent'

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name')
    .eq('username', username)
    .single()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <p className="text-sm text-slate-400">User not found</p>
      </div>
    )
  }

  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, location_name, country_code, latitude, longitude')
    .eq('user_id', user.id)
    .or('visibility.eq.public,privacy.eq.public')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  const locations = (albums || []).map(a => ({
    id: a.id,
    title: a.title,
    location: a.location_name || '',
    country_code: a.country_code || '',
    lat: a.latitude!,
    lng: a.longitude!,
  }))

  const countryCodes = [...new Set((albums || []).filter(a => a.country_code).map(a => a.country_code as string))]

  return (
    <EmbedMapContent
      username={user.username}
      displayName={user.display_name || user.username}
      locations={locations}
      countryCodes={countryCodes}
    />
  )
}
