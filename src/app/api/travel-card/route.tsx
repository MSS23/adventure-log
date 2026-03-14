import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

export const runtime = 'nodejs'

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function formatDistance(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`
  return km.toLocaleString()
}

function getPersonality(countries: number, trips: number, continents: number): string {
  if (continents >= 5) return 'World Explorer'
  if (countries >= 15) return 'Globe Trotter'
  if (countries >= 10) return 'Cultural Nomad'
  if (trips >= 12) return 'Perpetual Nomad'
  if (countries >= 5) return 'World Wanderer'
  if (trips >= 6) return 'Adventure Seeker'
  if (trips >= 3) return 'Weekend Warrior'
  if (trips >= 1) return 'Rising Explorer'
  return 'Future Explorer'
}

const continentMap: Record<string, string> = {
  US: 'NA', CA: 'NA', MX: 'NA', GT: 'NA', BZ: 'NA', HN: 'NA', SV: 'NA', NI: 'NA', CR: 'NA', PA: 'NA',
  CU: 'NA', JM: 'NA', HT: 'NA', DO: 'NA', TT: 'NA', BB: 'NA', BS: 'NA', PR: 'NA',
  BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA', EC: 'SA', BO: 'SA', PY: 'SA', UY: 'SA', GY: 'SA', SR: 'SA',
  GB: 'EU', FR: 'EU', DE: 'EU', IT: 'EU', ES: 'EU', PT: 'EU', NL: 'EU', BE: 'EU', CH: 'EU', AT: 'EU',
  SE: 'EU', NO: 'EU', DK: 'EU', FI: 'EU', IE: 'EU', PL: 'EU', CZ: 'EU', GR: 'EU', HR: 'EU', RO: 'EU',
  HU: 'EU', BG: 'EU', SK: 'EU', SI: 'EU', LT: 'EU', LV: 'EU', EE: 'EU', MT: 'EU', CY: 'EU', LU: 'EU',
  IS: 'EU', RS: 'EU', BA: 'EU', ME: 'EU', MK: 'EU', AL: 'EU', XK: 'EU', MD: 'EU', UA: 'EU', BY: 'EU',
  CN: 'AS', JP: 'AS', KR: 'AS', IN: 'AS', TH: 'AS', VN: 'AS', ID: 'AS', MY: 'AS', SG: 'AS', PH: 'AS',
  TW: 'AS', HK: 'AS', MO: 'AS', MM: 'AS', KH: 'AS', LA: 'AS', BD: 'AS', LK: 'AS', NP: 'AS', PK: 'AS',
  AE: 'AS', SA: 'AS', QA: 'AS', KW: 'AS', BH: 'AS', OM: 'AS', JO: 'AS', LB: 'AS', IL: 'AS', TR: 'AS',
  GE: 'AS', AM: 'AS', AZ: 'AS', KZ: 'AS', UZ: 'AS', MN: 'AS',
  ZA: 'AF', EG: 'AF', MA: 'AF', KE: 'AF', TZ: 'AF', NG: 'AF', GH: 'AF', ET: 'AF', UG: 'AF', RW: 'AF',
  SN: 'AF', CI: 'AF', CM: 'AF', TN: 'AF', DZ: 'AF', MZ: 'AF', ZW: 'AF', BW: 'AF', NA: 'AF', MU: 'AF',
  AU: 'OC', NZ: 'OC', FJ: 'OC', PG: 'OC', WS: 'OC', TO: 'OC', VU: 'OC', PF: 'OC', NC: 'OC', GU: 'OC',
  RU: 'EU',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data: user } = await supabase
      .from('users')
      .select('display_name, username, avatar_url')
      .eq('id', userId)
      .single()

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    const { data: albums } = await supabase
      .from('albums')
      .select('country_code, location_name, id, latitude, longitude, date_start, created_at')
      .eq('user_id', userId)
      .neq('status', 'draft')

    const { count: photoCount } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const allAlbums = albums || []
    const countryCodes = [...new Set(allAlbums.filter(a => a.country_code).map(a => a.country_code as string))]
    const cities = [...new Set(allAlbums.filter(a => a.location_name).map(a => a.location_name!.split(',')[0]?.trim()))]
    const flags = countryCodes.slice(0, 24).map(countryCodeToFlag)

    // Calculate distance
    const coords = allAlbums
      .filter(a => a.latitude && a.longitude && (a.date_start || a.created_at))
      .sort((a, b) => ((a.date_start || a.created_at) > (b.date_start || b.created_at) ? 1 : -1))
      .map(a => ({ lat: a.latitude!, lng: a.longitude! }))

    let totalDistance = 0
    for (let i = 1; i < coords.length; i++) {
      totalDistance += haversine(coords[i - 1], coords[i])
    }

    // Count continents
    const continents = new Set(countryCodes.map(c => continentMap[c]).filter(Boolean))

    const displayName = user.display_name || user.username || 'Traveler'
    const personality = getPersonality(countryCodes.length, allAlbums.length, continents.size)
    const worldPercent = Math.round((countryCodes.length / 195) * 100)

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, #1a2e0a 0%, #2d4a14 30%, #1e3a0e 60%, #0f1f05 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background effects */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              background: 'radial-gradient(circle at 15% 30%, rgba(153,177,105,0.15) 0%, transparent 50%), radial-gradient(circle at 85% 70%, rgba(74,93,35,0.2) 0%, transparent 50%)',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '44px 52px',
              flex: 1,
              position: 'relative',
            }}
          >
            {/* Top row: Name + Personality */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #99B169, #4A5D23)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: 'white',
                    fontWeight: 700,
                    border: '2px solid rgba(153,177,105,0.5)',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '15px', color: 'rgba(153,177,105,0.8)', lineHeight: 1.4 }}>
                    @{user.username} &middot; Travel Passport
                  </div>
                </div>
              </div>
              {/* Personality badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(153,177,105,0.15)',
                  border: '1px solid rgba(153,177,105,0.3)',
                  borderRadius: '24px',
                  padding: '8px 20px',
                }}
              >
                <span style={{ fontSize: '20px' }}>&#127757;</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#99B169' }}>
                  {personality}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
              {[
                { value: countryCodes.length.toString(), label: 'Countries', icon: '&#127758;' },
                { value: cities.length.toString(), label: 'Cities', icon: '&#128205;' },
                { value: (photoCount || 0).toString(), label: 'Photos', icon: '&#128247;' },
                { value: `${formatDistance(Math.round(totalDistance))} km`, label: 'Traveled', icon: '&#9992;' },
                { value: `${worldPercent}%`, label: 'of World', icon: '&#127760;' },
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                  <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(153,177,105,0.7)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Country flags grid */}
            {flags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                {flags.map((flag, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '36px',
                      width: '52px',
                      height: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(153,177,105,0.08)',
                      borderRadius: '10px',
                      border: '1px solid rgba(153,177,105,0.15)',
                    }}
                  >
                    {flag}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 52px 20px',
              borderTop: '1px solid rgba(153,177,105,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #99B169, #4A5D23)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                &#127757;
              </div>
              <span style={{ color: 'rgba(153,177,105,0.8)', fontSize: '14px', fontWeight: 600 }}>
                Adventure Log
              </span>
            </div>
            <span style={{ color: 'rgba(153,177,105,0.4)', fontSize: '13px' }}>
              Your travel life, on a globe
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    log.error('Travel card generation error', { component: 'TravelCard', action: 'generate' }, error as Error)
    return new Response('Failed to generate travel card', { status: 500 })
  }
}
