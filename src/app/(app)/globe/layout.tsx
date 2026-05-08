import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Globe - Adventure Log',
  description: 'Explore your travels on an interactive 3D globe visualization.',
}

export default function GlobeLayout({ children }: { children: React.ReactNode }) {
  return children
}
