import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GROQ API test endpoint - DISABLED IN PRODUCTION
 * This endpoint is only available in development for testing the GROQ API connection.
 */
export async function GET() {
  // Disable this endpoint in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    )
  }

  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not configured',
        configured: false
      })
    }

    const groq = new Groq({
      apiKey: apiKey,
    })

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "GROQ is working!" in exactly those words.' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 20,
    })

    return NextResponse.json({
      success: true,
      message: 'GROQ API is working',
      response: completion.choices[0]?.message?.content,
      model: completion.model
    })

  } catch (error: unknown) {
    const err = error as Error & { code?: string; status?: number }

    return NextResponse.json({
      error: 'Test failed',
      message: err?.message,
      code: err?.code,
      status: err?.status
    }, { status: 500 })
  }
}
