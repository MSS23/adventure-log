import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Fetch user profile
    const { data: user } = await supabase
      .from('users')
      .select('display_name, username, avatar_url')
      .eq('id', userId)
      .single()

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    // Fetch album stats
    const { data: albums } = await supabase
      .from('albums')
      .select('country_code, location_name, id')
      .eq('user_id', userId)

    const allAlbums = albums || []
    const countryCodes = [...new Set(allAlbums.filter(a => a.country_code).map(a => a.country_code as string))]
    const cities = [...new Set(allAlbums.filter(a => a.location_name).map(a => a.location_name!.split(',')[0]?.trim()))]

    const displayName = user.display_name || user.username || 'Traveler'
    const flags = countryCodes.slice(0, 30).map(countryCodeToFlag)

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0d9488 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.05,
              display: 'flex',
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(20,184,166,0.2) 0%, transparent 50%)',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '48px 56px',
              flex: 1,
              position: 'relative',
            }}
          >
            {/* Header with name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '36px', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)', lineHeight: 1.4 }}>
                  Travel Map
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '36px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 800, color: '#14b8a6', lineHeight: 1 }}>
                  {countryCodes.length}
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(148, 163, 184, 1)', marginTop: '4px' }}>
                  Countries
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>
                  {cities.length}
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(148, 163, 184, 1)', marginTop: '4px' }}>
                  Cities
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 800, color: '#2dd4bf', lineHeight: 1 }}>
                  {allAlbums.length}
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(148, 163, 184, 1)', marginTop: '4px' }}>
                  Adventures
                </div>
              </div>
            </div>

            {/* Country flags grid */}
            {flags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
                {flags.map((flag, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '40px',
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                    }}
                  >
                    {flag}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 56px 24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
              >
                &#9992;
              </div>
              <span style={{ color: 'rgba(148, 163, 184, 1)', fontSize: '16px', fontWeight: 600 }}>
                Adventure Log
              </span>
            </div>
            <span style={{ color: 'rgba(100, 116, 139, 1)', fontSize: '14px' }}>
              adventurelog.com
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
    console.error('Travel card generation error:', error)
    return new Response('Failed to generate travel card', { status: 500 })
  }
}
