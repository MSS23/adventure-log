'use client'

// Client-only wishlist page.
//
// Previously a Server Component that read JWT claims and pre-fetched items +
// travel partners with the Supabase server client — which can't be statically
// exported, so it was omitted from the Capacitor mobile bundle. WishlistContent
// already loads everything itself via the useWishlist() hook (items, partners,
// shared-by info) and only uses the initial props until that hook resolves, so
// handing it empty initials is enough. The (app) layout's <ProtectedRoute>
// gates auth on the client, replacing the server redirect('/login').

import WishlistContent from './WishlistContent'

export default function WishlistPage() {
  return <WishlistContent initialItems={[]} initialPartners={[]} />
}
