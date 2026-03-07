import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travel Journal - Adventure Log',
  description: 'Write and manage your personal travel journal entries.',
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children
}
