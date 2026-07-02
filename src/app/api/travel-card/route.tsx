import { ImageResponse } from '@vercel/og'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'
import { getFlagEmoji } from '@/lib/utils/country'
import { computeTravelStats } from '@/lib/utils/travel-stats'

export const runtime = 'nodejs'

function formatDistance(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`
  return km.toLocaleString()
}


export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data: user } = await supabase
      .from('users')
      .select('display_name, username, avatar_url, privacy_level')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // This is a shareable card. Only public accounts get a populated card for
    // OTHER viewers; private/friends accounts return 404 rather than leak
    // aggregate stats. The owner, however, can always download their own card
    // (the /wrapped "Download" button hits this authenticated with ?download=1),
    // so we allow the request through when the caller IS the profile owner.
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const isOwner = !!authUser && authUser.id === userId
    if (user.privacy_level !== 'public' && !isOwner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: albums } = await supabase
      .from('albums')
      .select('country_code, location_name, id, latitude, longitude, date_start, created_at')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .neq('status', 'draft')

    const allAlbums = albums || []

    // Count photos scoped to the SAME public, non-draft albums shown on the
    // card. Counting by user_id alone would include photos from private/draft
    // albums — leaking private-content volume onto a public share asset.
    let photoCount = 0
    const albumIds = allAlbums.map(a => a.id)
    if (albumIds.length > 0) {
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .in('album_id', albumIds)
      photoCount = count || 0
    }
    // Shared aggregation — identical numbers to the passport/wrapped surfaces.
    const stats = computeTravelStats(allAlbums)
    const countryCodes = stats.countryCodes
    const cities = stats.cities
    const flags = countryCodes.slice(0, 24).map(getFlagEmoji)
    const totalDistance = stats.totalDistanceKm

    const displayName = user.display_name || user.username || 'Traveler'
    const personality = stats.personality.type
    const worldPercent = stats.countryPercentage

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
                    background: 'linear-gradient(135deg, #34D399, #059669)',
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
                  <div style={{ fontSize: '15px', color: 'rgba(205,224,168,0.92)', lineHeight: 1.4 }}>
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
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#34D399' }}>
                  {personality}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
              {[
                { value: countryCodes.length.toString(), label: 'Countries', icon: '🌎' },
                { value: cities.length.toString(), label: 'Cities', icon: '📍' },
                { value: (photoCount || 0).toString(), label: 'Photos', icon: '📷' },
                { value: `${formatDistance(Math.round(totalDistance))} km`, label: 'Traveled', icon: '✈️' },
                { value: `${worldPercent}%`, label: 'of World', icon: '🌐' },
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Plain text children only — Satori (ImageResponse's
                      renderer) throws on dangerouslySetInnerHTML, which was
                      500-ing every card download. */}
                  <div style={{ display: 'flex', fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(205,224,168,0.86)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                  background: 'linear-gradient(135deg, #34D399, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                &#127757;
              </div>
              <span style={{ color: 'rgba(205,224,168,0.92)', fontSize: '14px', fontWeight: 600 }}>
                Adventure Log
              </span>
            </div>
            <span style={{ color: 'rgba(205,224,168,0.62)', fontSize: '13px' }}>
              Your travel life, on a globe
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          // Suggest the browser save this as a file when the user requests
          // it (the /wrapped Download button uses ?download=1). Otherwise
          // serve inline so it can be embedded in OG cards / sharing flows.
          'Content-Disposition': searchParams.get('download') === '1'
            ? `attachment; filename="${(user.username || 'travel-card').replace(/[^a-z0-9_-]/gi, '_')}-travel-card.png"`
            : 'inline',
          // Cache for 5 minutes — the underlying user data changes slowly,
          // and the cost of generation is non-trivial.
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error) {
    log.error('Travel card generation error', { component: 'TravelCard', action: 'generate' }, error as Error)
    return NextResponse.json({ error: 'Failed to generate travel card' }, { status: 500 })
  }
}
