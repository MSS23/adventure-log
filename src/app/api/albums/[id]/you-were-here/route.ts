import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  // Unauthenticated → no overlap to show
  if (!userId) {
    return NextResponse.json({ match: null })
  }

  try {
    // Fetch the target album's location
    const { data: album } = await supabase
      .from('albums')
      .select('id, user_id, visibility, location_name, latitude, longitude, country_code')
      .eq('id', id)
      .maybeSingle()

    if (!album) {
      return NextResponse.json({ match: null })
    }

    // If this IS the user's album, no ghost badge needed
    if (album.user_id === userId) {
      return NextResponse.json({ match: null })
    }

    // Explicit visibility gate — don't rely on the SELECT RLS policy alone.
    // Without this, probing private album IDs with candidate coordinates
    // works as a location-confirmation oracle whenever RLS churn weakens the
    // policy. Public → ok; friends → require a mutual accepted follow;
    // private/unknown → nothing.
    if (album.visibility !== 'public') {
      if (album.visibility !== 'friends') {
        return NextResponse.json({ match: null })
      }
      const [follow1, follow2] = await Promise.all([
        supabase.from('follows').select('id')
          .eq('follower_id', userId).eq('following_id', album.user_id)
          .eq('status', 'accepted').limit(1).maybeSingle(),
        supabase.from('follows').select('id')
          .eq('follower_id', album.user_id).eq('following_id', userId)
          .eq('status', 'accepted').limit(1).maybeSingle(),
      ])
      if (!follow1.data || !follow2.data) {
        return NextResponse.json({ match: null })
      }
    }

    const { data, error } = await supabase.rpc('find_overlap_album', {
      _user_id: userId,
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
      { component: 'api/albums/you-were-here', userId, albumId: id },
      error as Error
    )
    return NextResponse.json({ match: null })
  }
}
