import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PublicTripView from './PublicTripView'
import type { Trip, TripMember, TripPin } from '@/types/trips'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: trip } = await supabase
    .from('trips')
    .select('title, description, cover_emoji')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (!trip) return { title: 'Trip not found' }
  return {
    title: `${trip.cover_emoji || '🗺️'} ${trip.title} — Adventure Log`,
    description: trip.description || `A trip shared on Adventure Log`,
  }
}

export default async function PublicTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (!trip) notFound()

  const [{ data: members }, { data: pins }] = await Promise.all([
    supabase
      .from('trip_members')
      .select('*, user:users!trip_members_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('trip_id', trip.id),
    supabase
      .from('trip_pins')
      .select('*')
      .eq('trip_id', trip.id)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-line-warm)] bg-[color:var(--card)]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-olive-700 dark:text-olive-300 tracking-tight hover:opacity-80 transition-opacity"
          >
            Adventure Log
          </Link>
          <Link
            href="/sign-up"
            className="al-btn-coral text-sm px-5 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)] focus-visible:ring-offset-2"
          >
            Sign up free
          </Link>
        </div>
      </header>
      <PublicTripView
        trip={trip as Trip}
        members={(members || []) as TripMember[]}
        pins={(pins || []) as TripPin[]}
      />
    </div>
  )
}
