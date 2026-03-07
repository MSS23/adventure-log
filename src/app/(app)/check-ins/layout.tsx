import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Check-ins - Adventure Log',
  description: 'Track your location check-ins and share where you are traveling.',
}

export default function CheckInsLayout({ children }: { children: React.ReactNode }) {
  return children
}
