import { redirect } from 'next/navigation'

// The countries surface was consolidated into /passport. This route is kept
// only so existing links/bookmarks to /countries resolve instead of 404ing.
export default function CountriesPage() {
  redirect('/passport')
}
