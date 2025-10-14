import { NotificationSettings } from '@/components/notifications/NotificationSettings'

export default function NotificationSettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-gray-600">
          Manage your in-app notification preferences
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}
