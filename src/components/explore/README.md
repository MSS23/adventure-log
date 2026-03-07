# Explore Page Components

This directory contains all components for the Explore page, which helps users discover popular journeys, connect with fellow travelers, and explore featured destinations.

## Components

### SearchBar.tsx
**Purpose**: Global search functionality with real-time results dropdown

**Features**:
- Debounced search (300ms delay) for performance
- Searches albums by title/location and users by username/display name
- Real-time dropdown with categorized results
- Click outside to close dropdown
- Clear button for easy input reset
- Visual indicators for result types (Album/User badges)

**Props**:
- `placeholder?: string` - Custom placeholder text
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<SearchBar placeholder="Search locations, users, or keywords..." />
```

### PopularJourneysSection.tsx
**Purpose**: Displays a grid of popular/recent public albums

**Features**:
- Fetches public albums sorted by creation date
- 3-column responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Album cards with cover image, title, location, and user info
- Hover effects with smooth transitions
- Loading skeleton states
- "View Album" CTA button

**Props**:
- `className?: string` - Additional CSS classes
- `limit?: number` - Number of albums to display (default: 6)

**Usage**:
```tsx
<PopularJourneysSection limit={6} />
```

### CreatorsToFollowSection.tsx
**Purpose**: Displays a grid of suggested users to follow

**Features**:
- Fetches public users excluding current user
- 4-column responsive grid (2 col mobile, 3 col tablet, 4 col desktop)
- User cards with avatar, name, bio, and follow button
- Follow/unfollow functionality with loading states
- Tracks following status per user
- Requires authentication to follow (redirects to login if not authenticated)

**Props**:
- `className?: string` - Additional CSS classes
- `limit?: number` - Number of creators to display (default: 8)

**Usage**:
```tsx
<CreatorsToFollowSection limit={8} />
```

### FeaturedDestinationSection.tsx
**Purpose**: Displays a hero section highlighting a featured travel destination

**Features**:
- Weekly rotating featured destination (based on current week)
- Full-width hero image with gradient overlay
- High-quality stock images from Unsplash
- Large typography for location name
- Descriptive text about the destination
- "Explore Journeys" CTA linking to search results
- Decorative badge elements
- Pre-defined destinations: Amalfi Coast, Santorini, Kyoto, Patagonia

**Props**:
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<FeaturedDestinationSection />
```

**Note**: Featured destinations can be extended by adding more entries to the `featuredDestinations` array or fetching from a database.

## Page Structure

The Explore page (`src/app/(app)/explore/page.tsx`) combines all sections:

```tsx
<div className="min-h-screen bg-gray-50">
  <main className="max-w-7xl mx-auto px-6 py-8">
    {/* Search Bar */}
    <SearchBar />

    {/* Popular Journeys */}
    <section>
      <h2>Popular Journeys</h2>
      <PopularJourneysSection limit={6} />
    </section>

    {/* Creators to Follow */}
    <section>
      <h2>Creators to Follow</h2>
      <CreatorsToFollowSection limit={8} />
    </section>

    {/* Featured Destination */}
    <section>
      <h2>Featured Destination</h2>
      <FeaturedDestinationSection />
    </section>
  </main>
</div>
```

## Design System

All components follow the Adventure Log design system:

**Colors**:
- Background: `bg-gray-50` (light gray)
- Cards: `bg-white`
- Text: `text-gray-900`, `text-gray-600`
- Accent: `teal-500`/`teal-600` for primary actions
- Borders: `border-gray-200`

**Typography**:
- Section headings: `text-2xl font-bold text-gray-900`
- Card titles: `text-lg font-semibold`
- Subtitles: `text-sm text-gray-600`
- Body text: `text-base text-gray-700`

**Spacing**:
- Section margin: `mb-16`
- Card gap: `gap-6`
- Content padding: `px-6 py-8`

**Rounded Corners**:
- Cards: `rounded-2xl`
- Buttons: `rounded-lg`
- Search bar: `rounded-full`

**Interactive Elements**:
- Hover effects: `hover:shadow-lg hover:-translate-y-1`
- Button hover: `hover:bg-teal-600`
- Smooth transitions: `transition-all duration-300`

## Data Fetching

**Album Queries**:
- Filters: `privacy = 'public'`
- Order: `created_at DESC`
- Includes: user data, photos array
- Uses `getPhotoUrl()` for cover images

**User Queries**:
- Filters: `privacy_level = 'public'`, excludes current user
- Order: `created_at DESC`
- Includes: avatar, bio, username, display_name

**Follow Status**:
- Fetched from `follows` table
- Tracks `follower_id` and `following_id`
- Status field can be 'pending' or 'approved' (currently auto-approved)

## Accessibility

All components implement accessibility best practices:

- Semantic HTML elements (`<section>`, `<main>`, `<button>`)
- Proper ARIA labels for icon-only buttons
- Keyboard navigation support (tab, enter, escape)
- Focus visible states on interactive elements
- Alt text for all images
- Screen reader-friendly text for loading states

## Performance

**Optimizations**:
- Debounced search to reduce API calls
- Skeleton loading states for perceived performance
- Lazy image loading with Next.js Image component
- Efficient Supabase queries with proper limits and filters
- Component-level state management (no global state overhead)

## Future Enhancements

Potential improvements for the Explore page:

1. **Algorithm-based recommendations**: Sort albums by likes/views instead of just creation date
2. **Personalized suggestions**: Recommend users based on mutual follows or similar travel interests
3. **Featured destinations database**: Move from hardcoded array to database with admin management
4. **Infinite scroll**: Add pagination for Popular Journeys and Creators sections
5. **Filter options**: Add filters for location type, date range, travel style
6. **Analytics tracking**: Track which sections get the most engagement
7. **Social proof**: Show "X users visited this location" on featured destinations
8. **Trending hashtags**: Add a trending topics/locations section
