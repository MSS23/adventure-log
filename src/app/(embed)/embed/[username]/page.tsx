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
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white gap-3">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
        <p className="text-stone-500 text-sm font-medium">Traveler not found</p>
      </div>
    )
  }

  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, location_name, country_code, latitude, longitude')
    .eq('user_id', user.id)
    .eq('visibility', 'public')
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
