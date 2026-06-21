import { redirect } from 'next/navigation'

// The notifications surface was consolidated into /activity (the canonical
// inbox with live unread counts and tabbed feed). This route is kept only so
// existing links/bookmarks to /notifications resolve instead of 404ing.
export default function NotificationsPage() {
  redirect('/activity')
}
