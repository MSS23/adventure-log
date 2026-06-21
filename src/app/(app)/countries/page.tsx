import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { log } from '@/lib/utils/logger'
import CountriesContent from './CountriesContent'
import CountriesLoading from './loading'

export default function CountriesPage() {
  return (
    <Suspense fallback={<CountriesLoading />}>
      <CountriesData />
    </Suspense>
  )
}

async function CountriesData() {
  const supabase = await createClient()
  // Read the user id from verified JWT claims instead of a round-trip to the
  // Supabase Auth server. Middleware already validated the session this request
  // and every query below is user-scoped + RLS-protected.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    redirect('/login')
  }

  const { data: albums, error: fetchError } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (fetchError) {
    log.error('Error fetching albums for countries view', {
      component: 'CountriesPage',
      action: 'server-fetch',
      userId,
    }, fetchError)
  }

  return <CountriesContent albums={albums || []} />
}
