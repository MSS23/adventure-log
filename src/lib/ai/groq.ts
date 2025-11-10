import Groq from 'groq-sdk'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

export interface TripPlannerRequest {
  destination: string
  duration: string
  budget?: string
  interests?: string[]
  travelStyle?: string
}

export interface TripPlannerResponse {
  itinerary: string
  highlights: string[]
  tips: string[]
}

export async function generateTripPlan(request: TripPlannerRequest): Promise<TripPlannerResponse> {
  const { destination, duration, budget, interests, travelStyle } = request

  // Build the prompt
  const interestsText = interests && interests.length > 0
    ? `Interests: ${interests.join(', ')}`
    : ''

  const budgetText = budget ? `Budget: ${budget}` : ''
  const styleText = travelStyle ? `Travel style: ${travelStyle}` : ''

  const prompt = `You are an expert travel planner. Create a detailed travel itinerary for the following trip:

Destination: ${destination}
Duration: ${duration}
${budgetText}
${interestsText}
${styleText}

Please provide:
1. A day-by-day itinerary with activities, timing, and locations
2. Key highlights and must-see attractions
3. Practical tips for travelers

Format your response as a structured travel plan that's easy to read and follow.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert travel planner who creates detailed, practical, and exciting travel itineraries. Focus on giving specific recommendations with timing, locations, and helpful tips.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Fast and high-quality model
      temperature: 0.7,
      max_tokens: 2048,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Parse the response (simple parsing for now)
    const sections = content.split('\n\n')
    const highlights: string[] = []
    const tips: string[] = []

    // Extract highlights and tips from the content
    sections.forEach((section) => {
      if (section.toLowerCase().includes('highlight') || section.toLowerCase().includes('must-see')) {
        const lines = section.split('\n').filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        highlights.push(...lines.map((line) => line.replace(/^[-\d.]\s*/, '').trim()))
      }
      if (section.toLowerCase().includes('tip') || section.toLowerCase().includes('advice')) {
        const lines = section.split('\n').filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        tips.push(...lines.map((line) => line.replace(/^[-\d.]\s*/, '').trim()))
      }
    })

    return {
      itinerary: content,
      highlights: highlights.slice(0, 5), // Top 5 highlights
      tips: tips.slice(0, 5), // Top 5 tips
    }
  } catch (error) {
    console.error('Error generating trip plan with Groq:', error)
    throw new Error('Failed to generate trip plan. Please try again.')
  }
}
