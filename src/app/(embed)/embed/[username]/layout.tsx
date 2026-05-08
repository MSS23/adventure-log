import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travel Map Embed',
  robots: { index: false, follow: false },
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {children}
    </div>
  )
}
