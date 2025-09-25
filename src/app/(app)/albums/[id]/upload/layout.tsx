// Generate static params for album upload routes
export async function generateStaticParams() {
  // For mobile builds, return empty array (dynamic routes will work at runtime)
  return []
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}