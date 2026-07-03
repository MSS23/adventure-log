import { redirect } from 'next/navigation'

// Achievements now live on the profile page (Badges tab). This route is kept
// only so existing links/bookmarks to /achievements resolve instead of 404ing.
export default function AchievementsPage() {
  redirect('/profile')
}
