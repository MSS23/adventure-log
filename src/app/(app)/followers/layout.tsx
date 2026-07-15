import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Followers - Roamkeep',
  description: 'Manage your followers and the travelers you follow.',
}

export default function FollowersLayout({ children }: { children: React.ReactNode }) {
  return children
}
