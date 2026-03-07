import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute for geocoding
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.geocode, keyPrefix: 'geocode' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  // SECURITY: Require authentication to prevent unauthorized API access
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - authentication required' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const reverse = searchParams.get('reverse')

  try {
    let nominatimUrl: string

    if (reverse === 'true' && lat && lon) {
      // Reverse geocoding
      nominatimUrl = `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat,
          lon,
          format: 'json',
          'accept-language': 'en'
        }).toString()
    } else if (query) {
      // Forward geocoding
      nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: 'json',
          limit: '8',
          dedupe: '1',
          'accept-language': 'en',
          addressdetails: '1'
        }).toString()
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Adventure Log App (contact@example.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    // Use proper error handling without exposing internal details
    return NextResponse.json(
      { error: 'Failed to fetch location data' },
      { status: 500 }
    )
  }
}