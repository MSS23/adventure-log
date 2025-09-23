export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Marketing pages don't need AuthProvider
  // This layout bypasses the root layout's AuthProvider
  return <>{children}</>
}