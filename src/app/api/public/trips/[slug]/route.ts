import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('id, title, description, start_date, end_date, cover_emoji, status, owner_id, created_at')
      .eq('share_slug', slug)
      .eq('is_public', true)
      .maybeSingle()

    if (!trip) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: members } = await supabase
      .from('trip_members')
      .select('id, trip_id, user_id, color, role, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('trip_id', trip.id)

    const { data: pins } = await supabase
      .from('trip_pins')
      .select('id, trip_id, user_id, name, note, latitude, longitude, address, source_url, sort_order, visited_at, scheduled_day, created_at')
      .eq('trip_id', trip.id)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    return NextResponse.json({
      trip,
      members: members || [],
      pins: pins || [],
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load trip' }, { status: 500 })
  }
}
