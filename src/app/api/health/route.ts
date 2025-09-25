import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  // Simple static health response for mobile app
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    platform: 'mobile'
  }, {
    status: 200
  })
}