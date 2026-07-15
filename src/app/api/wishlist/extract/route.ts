import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'
import {
  detectPlatform,
  followRedirects,
  parseGoogleMapsUrl,
  fetchTikTokOEmbed,
  forwardGeocode,
  reverseGeocode,
  type LinkPlatform,
} from '@/lib/links/resolve'
import { extractPlacesFromText, isClaudeConfigured, type PlaceCategory } from '@/lib/ai/claude'

export interface PlaceCandidate {
  placeName: string
  locationName: string
  city: string | null
  countryCode: string | null
  latitude: number
  longitude: number
  category: PlaceCategory
  confidence: number
}

interface ExtractResponse {
  platform: LinkPlatform
  sourceUrl: string
  thumbnailUrl: string | null
  caption: string | null
  candidates: PlaceCandidate[]
  /** Names the AI found but we couldn't geocode — used to prefill manual search. */
  detectedNames: string[]
  needsManual: boolean
  message?: string
}

// Paste-a-link is interactive but hits external services + Claude (a paid API),
// so cap it PER USER via the distributed (Upstash) limiter — keying on the user
// id rather than IP stops one account from multiplying its Claude budget by
// rotating IPs / hitting different serverless instances.
const EXTRACT_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000, keyPrefix: 'sp-extract' }

// Pro gate: free plan includes this many AI link imports per calendar month.
// Counted against saved wishlist items (durable — the in-memory rate limiter
// resets on deploy, so it can't back a monthly quota).
const FREE_MONTHLY_IMPORTS = 10
export async function POST(request: NextRequest) {
  // Authenticate first so we can rate-limit on the user id.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = await rateLimitAsync(request, { ...EXTRACT_LIMIT, identifier: user.id })
  if (!limit.success) return rateLimitResponse(limit.reset)

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = body.url?.trim()
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return NextResponse.json({ error: 'Please paste a valid link (starting with http).' }, { status: 400 })
  }

  const platform = detectPlatform(rawUrl)

  // Only AI-powered TikTok extraction is metered. Google Maps contains
  // structured place data and stays available to every plan.
  if (platform === 'tiktok') {
    const { data: planRow, error: planError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    // Tolerate the plan column not existing yet (migration 69 not applied):
    // Postgres 42703 = undefined_column → treat the user as free. Likewise
    // 42501 = permission denied if migration 76's column-level grants are in
    // place without `plan` in the allowlist — same free-plan degradation.
    const plan = planError ? 'free' : (planRow?.plan ?? 'free')
    if (planError && planError.code !== '42703') {
      log.warn('Could not read user plan, treating as free', {
        component: 'SavedPlacesExtract',
        action: 'plan-check',
        userId: user.id,
      })
    }

    if (plan !== 'pro') {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const { count, error: countError } = await supabase
        .from('wishlist_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source_platform', 'tiktok')
        .gte('created_at', monthStart)

      // Fail open on count errors — never block imports because of a bad query.
      if (!countError && (count ?? 0) >= FREE_MONTHLY_IMPORTS) {
        return NextResponse.json(
          {
            error: 'Free plan includes 10 TikTok imports per month — upgrade to Pro for unlimited',
            code: 'UPGRADE_REQUIRED',
            upgradeUrl: '/pro',
          },
          { status: 402 }
        )
      }
    }
  }

  try {
    if (platform === 'google_maps') {
      const result = await resolveGoogleMaps(rawUrl)
      return NextResponse.json(result)
    }

    if (platform === 'tiktok') {
      const result = await resolveTikTok(rawUrl)
      return NextResponse.json(result)
    }

    // Unknown platform: best-effort — try treating the page title as a caption
    // is unreliable, so we just ask the user to add it manually.
    const fallback: ExtractResponse = {
      platform,
      sourceUrl: rawUrl,
      thumbnailUrl: null,
      caption: null,
      candidates: [],
      detectedNames: [],
      needsManual: true,
      message:
        platform === 'instagram'
          ? "Instagram doesn't expose captions to apps — search for the place below to add it."
          : 'Paste a TikTok or Google Maps link, or search for the place below to add it manually.',
    }
    return NextResponse.json(fallback)
  } catch (error) {
    log.error(
      'saved-places extract failed',
      { component: 'SavedPlacesExtract', action: 'extract', userId: user.id },
      error as Error
    )
    return NextResponse.json({ error: 'Could not read that link. Try adding the place manually.' }, { status: 502 })
  }
}

async function resolveGoogleMaps(rawUrl: string): Promise<ExtractResponse> {
  const finalUrl = await followRedirects(rawUrl)
  const { name, latitude, longitude } = parseGoogleMapsUrl(finalUrl)

  let candidate: PlaceCandidate | null = null

  if (latitude !== null && longitude !== null) {
    const geo = await reverseGeocode(latitude, longitude)
    candidate = {
      placeName: name || geo?.city || geo?.locationName || 'Dropped pin',
      locationName: geo?.locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: geo?.city ?? null,
      countryCode: geo?.countryCode ?? null,
      latitude,
      longitude,
      category: 'see',
      confidence: 0.95,
    }
  } else if (name) {
    const geo = await forwardGeocode(name)
    if (geo) {
      candidate = {
        placeName: name,
        locationName: geo.locationName,
        city: geo.city,
        countryCode: geo.countryCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        category: 'see',
        confidence: 0.8,
      }
    }
  }

  if (!candidate) {
    return {
      platform: 'google_maps',
      sourceUrl: finalUrl,
      thumbnailUrl: null,
      caption: name,
      candidates: [],
      detectedNames: name ? [name] : [],
      needsManual: true,
      message: "Couldn't pin that exact spot — search for it below to confirm.",
    }
  }

  return {
    platform: 'google_maps',
    sourceUrl: finalUrl,
    thumbnailUrl: null,
    caption: name,
    candidates: [candidate],
    detectedNames: [],
    needsManual: false,
  }
}

async function resolveTikTok(rawUrl: string): Promise<ExtractResponse> {
  // Expand vm.tiktok.com / vt.tiktok.com short links to the canonical video URL.
  const finalUrl = await followRedirects(rawUrl)
  const oembed = await fetchTikTokOEmbed(finalUrl)
  const caption = oembed?.title?.trim() || null
  const thumbnailUrl = oembed?.thumbnailUrl ?? null

  if (!caption) {
    return {
      platform: 'tiktok',
      sourceUrl: finalUrl,
      thumbnailUrl,
      caption: null,
      candidates: [],
      detectedNames: [],
      needsManual: true,
      message: "Couldn't read this TikTok's caption — search for the place below to add it.",
    }
  }

  if (!isClaudeConfigured()) {
    return {
      platform: 'tiktok',
      sourceUrl: finalUrl,
      thumbnailUrl,
      caption,
      candidates: [],
      detectedNames: [],
      needsManual: true,
      message: 'AI place detection is not configured yet — search for the place below to add it.',
    }
  }

  const extracted = await extractPlacesFromText(caption)

  // Geocode each detected place (placeName + locationHint for disambiguation).
  const candidates: PlaceCandidate[] = []
  const detectedNames: string[] = []

  for (const place of extracted) {
    const query = place.locationHint ? `${place.placeName}, ${place.locationHint}` : place.placeName
    const geo = (await forwardGeocode(query)) || (await forwardGeocode(place.placeName))
    if (geo) {
      candidates.push({
        placeName: place.placeName,
        locationName: geo.locationName,
        city: geo.city,
        countryCode: geo.countryCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        category: place.category,
        confidence: place.confidence,
      })
    } else {
      detectedNames.push(place.placeName)
    }
  }

  return {
    platform: 'tiktok',
    sourceUrl: finalUrl,
    thumbnailUrl,
    caption,
    candidates,
    detectedNames,
    needsManual: candidates.length === 0,
    message:
      candidates.length === 0
        ? detectedNames.length > 0
          ? `Found "${detectedNames[0]}" but couldn't place it on the map — search to confirm.`
          : "Couldn't spot a place in this video's caption — search to add it manually."
        : undefined,
  }
}
