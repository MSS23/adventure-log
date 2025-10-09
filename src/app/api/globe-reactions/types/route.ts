import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/globe-reactions/types
 * Fetch available reaction types (stickers)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('globe_reaction_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching reaction types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reaction types' },
        { status: 500 }
      )
    }

    return NextResponse.json({ types: data || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/globe-reactions/types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
