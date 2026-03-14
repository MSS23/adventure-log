import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Adventure Log - Your travel life, on a globe'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(145deg, #1a2e0a 0%, #2d4a14 40%, #0f1f05 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: '100px', marginBottom: '16px', display: 'flex' }}>🌍</div>
        <div style={{ fontSize: '56px', fontWeight: 800, color: 'white', display: 'flex' }}>
          Adventure Log
        </div>
        <div style={{ fontSize: '24px', color: '#99B169', marginTop: '8px', display: 'flex' }}>
          Your travel life, on a globe
        </div>
      </div>
    ),
    { ...size }
  )
}
