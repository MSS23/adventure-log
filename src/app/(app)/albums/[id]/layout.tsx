// Generate static params for dynamic album routes
export async function generateStaticParams() {
  // For mobile builds, return empty array (dynamic routes will work at runtime)
  return []
}

export default function AlbumLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  return children
}