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
            background: 'radial-gradient(circle at 30% 40%, rgba(153,177,105,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(74,93,35,0.2) 0%, transparent 50%)',
          }}
        />

        {/* Globe emoji as visual */}
        <div style={{ fontSize: '120px', marginBottom: '20px', display: 'flex' }}>
          🌍
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
            textAlign: 'center',
            marginBottom: '8px',
            display: 'flex',
          }}
        >
          Adventure Log
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: '#99B169',
            textAlign: 'center',
            marginBottom: '32px',
            display: 'flex',
          }}
        >
          Your travel life, on a globe
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '40px' }}>
          {[
            { emoji: '🗺️', label: '3D Globe' },
            { emoji: '📸', label: 'Photo Albums' },
            { emoji: '🎬', label: 'Flyover Videos' },
            { emoji: '🛂', label: 'Travel Passport' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '32px', display: 'flex' }}>{item.emoji}</span>
              <span style={{ fontSize: '14px', color: 'rgba(153,177,105,0.7)', fontWeight: 600, display: 'flex' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '14px', color: 'rgba(153,177,105,0.4)', display: 'flex' }}>
            Free forever · No ads · adventurelog.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
