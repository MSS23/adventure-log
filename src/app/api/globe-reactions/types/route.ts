import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

/**
 * GET /api/globe-reactions/types
 * Fetch available reaction types (stickers)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('globe_reaction_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      log.error('Error fetching reaction types', { component: 'GlobeReactions', action: 'fetch-types' }, error)
      return NextResponse.json(
        { error: 'Failed to fetch reaction types' },
        { status: 500 }
      )
    }

    return NextResponse.json({ types: data || [] })
  } catch (error) {
    log.error('Unexpected error in GET /api/globe-reactions/types', { component: 'GlobeReactions', action: 'fetch-types' }, error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
