import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

/**
 * Convert a completed trip into an album draft.
 * - Uses trip title + description as album seed
 * - Averages pin coordinates for album location
 * - Uses trip.start_date as date_start
 * - Creates an empty album (photos to be added by the user)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle()
    if (tripErr || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const { data: pins } = await supabase
      .from('trip_pins')
      .select('latitude, longitude, address, visited_at')
      .eq('trip_id', tripId)

    const visitedPins = (pins || []).filter((p) => p.visited_at)
    const relevantPins = visitedPins.length > 0 ? visitedPins : pins || []

    let avgLat: number | null = null
    let avgLng: number | null = null
    let locationName: string | null = null

    if (relevantPins.length > 0) {
      avgLat = relevantPins.reduce((s: number, p: { latitude: number }) => s + p.latitude, 0) / relevantPins.length
      avgLng = relevantPins.reduce((s: number, p: { longitude: number }) => s + p.longitude, 0) / relevantPins.length
      const firstWithAddress = relevantPins.find((p: { address: string | null }) => p.address)
      if (firstWithAddress?.address) {
        const parts = firstWithAddress.address.split(',').map((s: string) => s.trim())
        locationName = parts.slice(-2).join(', ')
      }
    }

    const { data: album, error: albumErr } = await supabase
      .from('albums')
      .insert({
        user_id: user.id,
        title: trip.title,
        description: trip.description,
        date_start: trip.start_date,
        start_date: trip.start_date,
        latitude: avgLat,
        longitude: avgLng,
        location_name: locationName,
        visibility: 'public',
      })
      .select()
      .single()

    if (albumErr) throw albumErr

    // Mark trip as completed
    await supabase
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', tripId)

    return NextResponse.json({ album })
  } catch (error) {
    log.error('Save as album failed', { component: 'api/trips/save-as-album', userId: user.id, tripId }, error as Error)
    return NextResponse.json({ error: 'Failed to save as album' }, { status: 500 })
  }
}
