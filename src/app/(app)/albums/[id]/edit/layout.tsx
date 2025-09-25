// Generate static params for album edit routes
export async function generateStaticParams() {
  // For mobile builds, return empty array (dynamic routes will work at runtime)
  return []
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}