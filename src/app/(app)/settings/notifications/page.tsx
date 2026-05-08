import { NotificationSettings } from '@/components/settings/NotificationSettings'

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">Notification Settings</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Manage your in-app notification preferences
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}
