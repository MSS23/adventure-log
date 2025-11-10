import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

export const runtime = 'nodejs'

interface TripRequest {
  country: string
  region: string
  travelDates: string
  travelStyle: string
  budget: string
  additionalDetails: string
}

const MONTHLY_FREE_LIMIT = 3

export async function POST(request: NextRequest) {
  try {
    const body: TripRequest = await request.json()
    const { country, region, travelDates, travelStyle, budget, additionalDetails } = body

    // Validate required fields
    if (!country || !region) {
      return NextResponse.json(
        { error: 'Country and region are required' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check usage limits
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_or_create_ai_usage', {
        p_user_id: user.id,
        p_feature_type: 'trip_planner'
      })

    if (usageError) {
      console.error('Error checking usage:', usageError)
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      )
    }

    // Check if limit exceeded
    const currentUsage = usageData?.[0]
    if (currentUsage?.limit_exceeded) {
      return NextResponse.json(
        {
          error: `You've reached your monthly limit of ${MONTHLY_FREE_LIMIT} AI trip generations. Upgrade to Premium for unlimited access!`,
          remainingGenerations: 0,
          limitExceeded: true
        },
        { status: 429 }
      )
    }

    // Build the prompt for Groq
    const prompt = buildTripPrompt({
      country,
      region,
      travelDates,
      travelStyle,
      budget,
      additionalDetails,
    })

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional travel planner who creates detailed, personalized travel itineraries. Focus on giving specific recommendations with timing, locations, and helpful tips.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048,
    })

    // Extract the generated itinerary
    const itinerary = completion.choices[0]?.message?.content || 'Failed to generate itinerary'

    // Increment usage count after successful generation
    const { data: incrementData, error: incrementError } = await supabase
      .rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_feature_type: 'trip_planner'
      })

    if (incrementError) {
      console.error('Error incrementing usage:', incrementError)
      // Don't fail the request, but log the error
    }

    const remainingGenerations = MONTHLY_FREE_LIMIT - (incrementData?.[0]?.new_count || 0)

    return NextResponse.json({
      itinerary,
      remainingGenerations: Math.max(0, remainingGenerations),
      usageCount: incrementData?.[0]?.new_count || 0
    })
  } catch (error) {
    console.error('Error generating trip:', error)

    // Handle Groq API errors
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json(
        { error: `AI service error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: (error as { status?: number }).status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate trip itinerary. Please try again.' },
      { status: 500 }
    )
  }
}

function buildTripPrompt(request: TripRequest): string {
  const { country, region, travelDates, travelStyle, budget, additionalDetails } = request

  let prompt = `You are a professional travel planner. Create a detailed, personalized travel itinerary based on the following information:

**Destination:** ${region}, ${country}
**Travel Style:** ${travelStyle}
**Budget:** ${budget}`

  if (travelDates) {
    prompt += `\n**Travel Dates:** ${travelDates}`
  }

  if (additionalDetails) {
    prompt += `\n**Additional Requirements:** ${additionalDetails}`
  }

  prompt += `

Please provide a comprehensive itinerary that includes:

1. **Overview**: A brief introduction to the destination and what makes it special
2. **Best Time to Visit**: When to go and why
3. **Day-by-Day Itinerary**: A suggested schedule with activities, attractions, and experiences
4. **Accommodation Recommendations**: Where to stay based on the budget
5. **Food & Dining**: Must-try local dishes and restaurant suggestions
6. **Transportation**: How to get around
7. **Budget Breakdown**: Estimated costs for accommodations, food, activities, and transportation
8. **Travel Tips**: Useful advice, cultural considerations, and insider tips
9. **Packing Essentials**: What to bring specific to this destination and travel style

Format the itinerary in a clear, easy-to-read manner with sections and bullet points. Make it practical, actionable, and exciting! Focus on authentic experiences that match the ${travelStyle} travel style and ${budget} budget.`

  return prompt
}
