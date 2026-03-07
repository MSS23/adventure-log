import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

// GET /api/companions - Get matched travel profiles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current user's travel profile
    const { data: myProfile, error: profileError } = await supabase
      .from('travel_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !myProfile) {
      return NextResponse.json({ data: [], message: 'Create a travel profile first' })
    }

    // Get all other travel profiles that are looking for companions
    const { data: profiles, error: matchError } = await supabase
      .from('travel_profiles')
      .select(`
        *,
        user:users(id, name, username, display_name, avatar_url, bio, location)
      `)
      .eq('is_looking_for_companions', true)
      .neq('user_id', user.id)
      .limit(50)

    if (matchError) {
      log.error('Failed to fetch companion profiles', {
        component: 'CompanionsAPI',
        action: 'get-matches',
        userId: user.id,
      }, matchError)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    // Calculate compatibility scores
    const matches = (profiles || []).map((profile) => {
      let score = 0
      let maxScore = 0

      // Travel styles overlap (weight: 30)
      maxScore += 30
      const sharedStyles = (myProfile.travel_styles || []).filter(
        (s: string) => (profile.travel_styles || []).includes(s)
      )
      if ((myProfile.travel_styles || []).length > 0 && (profile.travel_styles || []).length > 0) {
        score += Math.round(
          (sharedStyles.length /
            Math.max((myProfile.travel_styles || []).length, (profile.travel_styles || []).length)) *
            30
        )
      }

      // Shared interests (weight: 30)
      maxScore += 30
      const sharedInterests = (myProfile.interests || []).filter(
        (i: string) => (profile.interests || []).includes(i)
      )
      if ((myProfile.interests || []).length > 0 && (profile.interests || []).length > 0) {
        score += Math.round(
          (sharedInterests.length /
            Math.max((myProfile.interests || []).length, (profile.interests || []).length)) *
            30
        )
      }

      // Upcoming destinations overlap (weight: 25)
      maxScore += 25
      const sharedDestinations = (myProfile.upcoming_destinations || []).filter(
        (d: string) => (profile.upcoming_destinations || []).includes(d)
      )
      if (
        (myProfile.upcoming_destinations || []).length > 0 &&
        (profile.upcoming_destinations || []).length > 0
      ) {
        score += Math.round(
          (sharedDestinations.length /
            Math.max(
              (myProfile.upcoming_destinations || []).length,
              (profile.upcoming_destinations || []).length
            )) *
            25
        )
      }

      // Budget match (weight: 10)
      maxScore += 10
      if (myProfile.preferred_budget && profile.preferred_budget) {
        if (myProfile.preferred_budget === profile.preferred_budget) {
          score += 10
        }
      }

      // Pace match (weight: 5)
      maxScore += 5
      if (myProfile.preferred_pace && profile.preferred_pace) {
        if (myProfile.preferred_pace === profile.preferred_pace) {
          score += 5
        }
      }

      const compatibilityScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

      return {
        ...profile,
        compatibility_score: compatibilityScore,
        shared_styles: sharedStyles,
        shared_interests: sharedInterests,
        shared_destinations: sharedDestinations,
      }
    })

    // Sort by compatibility score descending
    matches.sort((a, b) => b.compatibility_score - a.compatibility_score)

    log.info('Companion matches fetched', {
      component: 'CompanionsAPI',
      action: 'get-matches',
      userId: user.id,
      matchCount: matches.length,
    })

    return NextResponse.json({ data: matches })
  } catch (error) {
    log.error('Companions API error', { component: 'CompanionsAPI', action: 'get' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/companions - Create or update travel profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      travel_styles,
      languages,
      preferred_budget,
      preferred_pace,
      interests,
      upcoming_destinations,
      bio_travel,
      is_looking_for_companions,
      age_range_min,
      age_range_max,
    } = body

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('travel_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const profileData = {
      user_id: user.id,
      travel_styles: travel_styles || [],
      languages: languages || [],
      preferred_budget: preferred_budget || null,
      preferred_pace: preferred_pace || null,
      interests: interests || [],
      upcoming_destinations: upcoming_destinations || [],
      bio_travel: bio_travel || null,
      is_looking_for_companions: is_looking_for_companions ?? true,
      age_range_min: age_range_min || null,
      age_range_max: age_range_max || null,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      // Update existing profile
      result = await supabase
        .from('travel_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Create new profile
      result = await supabase
        .from('travel_profiles')
        .insert({ ...profileData, created_at: new Date().toISOString() })
        .select()
        .single()
    }

    if (result.error) {
      log.error('Failed to save travel profile', {
        component: 'CompanionsAPI',
        action: 'save-profile',
        userId: user.id,
      }, result.error)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    log.info('Travel profile saved', {
      component: 'CompanionsAPI',
      action: 'save-profile',
      userId: user.id,
    })

    return NextResponse.json({ data: result.data }, { status: existing ? 200 : 201 })
  } catch (error) {
    log.error('Companions API error', { component: 'CompanionsAPI', action: 'post' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
