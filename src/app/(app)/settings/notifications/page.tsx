import { NotificationSettings } from '@/components/settings/NotificationSettings'

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      <div className="mb-6">
        <p className="al-eyebrow mb-1">Preferences</p>
        <h1 className="al-display text-3xl md:text-4xl">Notifications</h1>
        <p className="text-sm text-[color:var(--color-muted-warm)] mt-2 max-w-xl leading-relaxed">
          Manage your in-app notification preferences.
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}
