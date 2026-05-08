import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY

export async function GET(request: NextRequest) {
  // Require authentication to prevent abuse
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const q = searchParams.get('q')
  const dt = searchParams.get('dt')
  const cnt = searchParams.get('cnt')

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'demo_key') {
    return NextResponse.json({ error: 'Weather API not configured' }, { status: 503 })
  }

  let url: string
  const baseUrl = 'https://api.openweathermap.org/data/2.5'
  const geoUrl = 'https://api.openweathermap.org/geo/1.0'
  const oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall'

  switch (endpoint) {
    case 'current':
      if (!lat || !lon) return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
      url = `${baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      break
    case 'forecast':
      if (!lat || !lon) return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
      url = `${baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric${cnt ? `&cnt=${cnt}` : ''}`
      break
    case 'historical':
      if (!lat || !lon || !dt) return NextResponse.json({ error: 'lat, lon, and dt required' }, { status: 400 })
      url = `${oneCallUrl}/timemachine?lat=${lat}&lon=${lon}&dt=${dt}&appid=${OPENWEATHER_API_KEY}&units=metric`
      break
    case 'geocode':
      if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })
      url = `${geoUrl}/direct?q=${encodeURIComponent(q)}&limit=1&appid=${OPENWEATHER_API_KEY}`
      break
    default:
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Weather API error' }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}
