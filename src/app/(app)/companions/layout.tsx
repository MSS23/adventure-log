import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travel Companions - Adventure Log',
  description: 'Find and connect with travel companions for your next adventure.',
}

export default function CompanionsLayout({ children }: { children: React.ReactNode }) {
  return children
}
