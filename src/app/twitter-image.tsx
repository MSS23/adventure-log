import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Roamkeep - Your travel life, on a globe'
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
          background: 'linear-gradient(145deg, #0C1014 0%, #134E4A 45%, #0C1014 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: '100px', marginBottom: '16px', display: 'flex' }}>🌍</div>
        <div style={{ fontSize: '56px', fontWeight: 800, color: 'white', display: 'flex' }}>
          Roamkeep
        </div>
        <div style={{ fontSize: '24px', color: '#34D399', marginTop: '8px', display: 'flex' }}>
          Your travel life, on a globe
        </div>
      </div>
    ),
    { ...size }
  )
}
