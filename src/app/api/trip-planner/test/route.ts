import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('=== GROQ API Test Starting ===')

    // Check if API key exists
    const apiKey = process.env.GROQ_API_KEY
    console.log('API Key exists:', !!apiKey)
    console.log('API Key length:', apiKey?.length || 0)
    console.log('API Key first 10 chars:', apiKey?.substring(0, 10) + '...')

    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not found in environment',
        env: Object.keys(process.env).filter(k => k.includes('GROQ'))
      })
    }

    // Try to initialize client
    console.log('Initializing GROQ client...')
    const groq = new Groq({
      apiKey: apiKey,
    })
    console.log('GROQ client initialized successfully')

    // Try a simple API call
    console.log('Making test API call...')
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "GROQ is working!" in exactly those words.' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 20,
    })

    console.log('API call successful!')
    console.log('Response:', completion.choices[0]?.message?.content)

    return NextResponse.json({
      success: true,
      message: 'GROQ API is working in Next.js runtime',
      response: completion.choices[0]?.message?.content,
      model: completion.model,
      usage: completion.usage
    })

  } catch (error: any) {
    console.error('=== GROQ Test Error ===')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error status:', error?.status)
    console.error('Error type:', error?.type)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Error keys:', Object.keys(error))
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('Stack:', error?.stack)

    return NextResponse.json({
      error: 'Test failed',
      message: error?.message,
      code: error?.code,
      status: error?.status,
      type: error?.type,
      name: error?.name,
      constructor: error?.constructor?.name,
      allKeys: Object.keys(error),
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    }, { status: 500 })
  }
}
