import Anthropic from '@anthropic-ai/sdk'
import { log } from '@/lib/utils/logger'

/**
 * Anthropic (Claude) client + helpers.
 *
 * Server-only. Reads ANTHROPIC_API_KEY from the environment. Never import this
 * into a client component — the key must never reach the browser.
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Haiku: cheap + fast, plenty capable for short entity-extraction tasks.
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'

export type PlaceCategory = 'see' | 'eat' | 'do' | 'stay' | 'other'

export interface ExtractedPlace {
  /** The specific place or destination named in the text. */
  placeName: string
  /** Best-guess city/region/country context to help geocoding ("Lisbon, Portugal"). */
  locationHint: string | null
  category: PlaceCategory
  /** 0–1 — how confident the model is that this is a real, geocodable place. */
  confidence: number
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

const SYSTEM_PROMPT = `You extract travel places from short social-media captions (e.g. TikTok video descriptions).

Given a caption, identify the specific real-world place(s) a traveller would want to visit — a restaurant, bar, viewpoint, beach, museum, neighbourhood, hotel, city, etc.

Rules:
- Only include places that actually appear in or are strongly implied by the text. Do NOT invent places.
- Prefer the most specific named place. If only a city/country is mentioned, return that.
- "locationHint" should add city/country context to disambiguate for geocoding (e.g. place "Time Out Market", locationHint "Lisbon, Portugal"). Use null if there's truly no signal.
- category: "eat" (restaurants/cafes/bars/food), "stay" (hotels/accommodation), "do" (activities/tours/experiences), "see" (sights/views/landmarks/neighbourhoods), else "other".
- confidence: 0–1. Be honest. If the caption only has vibes and no real place name, return an empty list.
- Return at most 5 places.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{"places":[{"placeName":string,"locationHint":string|null,"category":"see"|"eat"|"do"|"stay"|"other","confidence":number}]}`

/**
 * Pull a JSON object out of a model response that may (despite instructions)
 * be wrapped in prose or a ```json fence. Returns null if nothing parses.
 */
function parsePlacesJson(text: string): ExtractedPlace[] | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { places?: unknown }
    if (!parsed || !Array.isArray(parsed.places)) return null

    const valid: PlaceCategory[] = ['see', 'eat', 'do', 'stay', 'other']
    return parsed.places
      .map((p): ExtractedPlace | null => {
        if (!p || typeof p !== 'object') return null
        const o = p as Record<string, unknown>
        const placeName = typeof o.placeName === 'string' ? o.placeName.trim() : ''
        if (!placeName) return null
        const category = valid.includes(o.category as PlaceCategory)
          ? (o.category as PlaceCategory)
          : 'other'
        const confidence =
          typeof o.confidence === 'number' && o.confidence >= 0 && o.confidence <= 1
            ? o.confidence
            : 0.5
        const locationHint =
          typeof o.locationHint === 'string' && o.locationHint.trim()
            ? o.locationHint.trim()
            : null
        return { placeName, locationHint, category, confidence }
      })
      .filter((p): p is ExtractedPlace => p !== null)
      .slice(0, 5)
  } catch {
    return null
  }
}

/**
 * Extract candidate places from a free-text caption using Claude.
 * Returns an empty array (never throws) when nothing usable is found, the key
 * is missing, or the API call fails — callers fall back to manual entry.
 */
export async function extractPlacesFromText(caption: string): Promise<ExtractedPlace[]> {
  const text = caption?.trim()
  if (!text) return []

  if (!isClaudeConfigured()) {
    log.warn('ANTHROPIC_API_KEY not set — skipping place extraction', {
      component: 'ClaudeAI',
      action: 'extract-places',
    })
    return []
  }

  try {
    const message = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text.slice(0, 2000) }],
    })

    const content = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    return parsePlacesJson(content) ?? []
  } catch (error) {
    log.error(
      'Claude place extraction failed',
      { component: 'ClaudeAI', action: 'extract-places' },
      error as Error
    )
    return []
  }
}
