export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minimal layout - no navigation, no padding, designed for iframe embedding
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900">
      {children}
    </div>
  )
}
