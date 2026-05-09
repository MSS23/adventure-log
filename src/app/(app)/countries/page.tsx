import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { log } from '@/lib/utils/logger'
import CountriesContent from './CountriesContent'

export default async function CountriesPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const supabase = await createClient()

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
