'use client'

import { useParams } from 'next/navigation'
import { BlendContent } from '@/components/blend/BlendContent'

/**
 * Travel Blend — a Spotify-Blend-style compatibility view between the
 * signed-in viewer and another traveler they've connected with (typically
 * after scanning that traveler's passport QR, which auto-creates a mutual
 * follow via /api/passport/connect).
 *
 * The route resolves `[username]` to a user and hands off to the client
 * `BlendContent`, which reads both users' albums with the authenticated
 * Supabase client (RLS-safe) and computes the blend client-side.
 *
 * Web-only dynamic route (excluded from the static mobile bundle).
 */
export default function BlendPage() {
  const params = useParams()
  const username = Array.isArray(params.username) ? params.username[0] : params.username

  return <BlendContent username={username ?? ''} />
}
