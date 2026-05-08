import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Unauthenticated → no overlap to show
  if (authError || !user) {
    return NextResponse.json({ match: null })
  }

  try {
    // Fetch the target album's location
    const { data: album } = await supabase
      .from('albums')
      .select('id, user_id, location_name, latitude, longitude, country_code')
      .eq('id', id)
      .maybeSingle()

    if (!album) {
      return NextResponse.json({ match: null })
    }

    // If this IS the user's album, no ghost badge needed
    if (album.user_id === user.id) {
      return NextResponse.json({ match: null })
    }

    const { data, error } = await supabase.rpc('find_overlap_album', {
      _user_id: user.id,
      _location_name: album.location_name || null,
      _latitude: album.latitude || null,
      _longitude: album.longitude || null,
    })

    if (error) throw error
    const match = data?.[0] || null

    return NextResponse.json({ match })
  } catch (error) {
    log.error(
      'You-were-here lookup failed',
      { component: 'api/albums/you-were-here', userId: user.id, albumId: id },
      error as Error
    )
    return NextResponse.json({ match: null })
  }
}
