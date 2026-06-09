import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NotificationSettings } from '@/components/settings/NotificationSettings'

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-[color:var(--color-muted-warm)] hover:text-[color:var(--color-ink)] mb-3 cursor-pointer transition-colors duration-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to settings
        </Link>
        <p className="al-eyebrow mb-1">Preferences</p>
        <h1 className="al-display text-3xl md:text-4xl">Notifications</h1>
        <p className="al-body mt-2 max-w-xl">
          Choose which activity you want to be notified about.
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}
