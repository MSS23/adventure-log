import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notifications - Adventure Log',
  description: 'Stay up to date with your latest notifications and activity.',
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
