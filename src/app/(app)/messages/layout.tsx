import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Messages - Adventure Log',
  description: 'Send and receive direct messages with fellow travelers.',
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
