import { redirect } from 'next/navigation'

// Dashboard was retired: Feed is the single home surface (5-tab nav), and
// the old dashboard duplicated Feed + Profile. First-run guidance and
// collaboration invites moved onto /feed. Old bookmarks land here.
export default function DashboardPage() {
  redirect('/feed')
}
