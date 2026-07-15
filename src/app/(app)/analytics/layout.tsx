import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics - Roamkeep',
  description: 'View your travel analytics, statistics, and insights about your adventures.',
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children
}
