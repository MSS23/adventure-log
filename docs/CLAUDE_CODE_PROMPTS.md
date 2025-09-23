# Claude Code Prompts for Adventure Log

## Base Context for All Prompts

Context: Adventure Log - Social travel platform
Tech Stack: Next.js 14, TypeScript, Supabase, Tailwind CSS, shadcn/ui, react-globe-gl
Architecture: See ARCHITECTURE.md, database schema in DATABASE_SCHEMA.md
Standards: Follow CODING_STANDARDS.md patterns
Goal: Build production-ready travel logging app with 3D globe visualization

Task: [specific request]

## Day 1: Authentication & Layout

### Authentication System

Build complete authentication system for Adventure Log.

Requirements:
- Email/password signup/login using Supabase Auth
- Profile creation flow after first login
- Password reset functionality
- Auth context provider with session management
- Protected route wrapper component
- Login/signup forms with validation using react-hook-form + Zod
- Error handling and loading states
- Responsive design with shadcn/ui components

Files to create:
- app/(auth)/login/page.tsx
- app/(auth)/signup/page.tsx
- components/auth/AuthProvider.tsx
- components/auth/ProtectedRoute.tsx
- lib/hooks/useAuth.ts
- lib/validations/auth.ts

Follow security best practices and include proper TypeScript types.

### App Layout & Navigation

Create main application layout and navigation for Adventure Log.

Requirements:
- Responsive layout with sidebar navigation
- Mobile hamburger menu with smooth animations
- Header with user avatar dropdown
- Navigation items: Dashboard, Albums, Globe, Profile, Settings
- User avatar with dropdown (profile, settings, logout)
- Loading states and error boundaries
- Consistent styling with shadcn/ui
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.2 AA)

Files to create:
- app/(app)/layout.tsx
- components/layout/AppHeader.tsx
- components/layout/Sidebar.tsx
- components/layout/MobileNav.tsx
- components/ui/UserAvatar.tsx

Use Framer Motion for smooth animations.

### Profile Management

Build user profile management system.

Requirements:
- Profile creation form (username, display_name, bio, location)
- Avatar upload to Supabase Storage with image compression
- Profile viewing page with travel stats
- Edit profile functionality
- Form validation with Zod schemas
- Image cropping and optimization
- Real-time updates with React Query
- Error handling and success feedback

Files to create:
- app/(app)/profile/page.tsx
- app/(app)/profile/edit/page.tsx
- components/profile/ProfileForm.tsx
- components/profile/AvatarUpload.tsx
- lib/hooks/useProfile.ts
- lib/validations/profile.ts
- lib/utils/imageUtils.ts

Include proper file upload security and validation.

## Day 2: Albums & Photos

### Album Management System

Build complete album management system for Adventure Log.

Requirements:
- Album creation form with title, description, date range, visibility
- Album listing page with grid layout and infinite scroll
- Individual album view with photo gallery
- Edit album functionality
- Delete album with confirmation
- Album visibility settings (private, friends, public)
- Tags system for albums
- Location association with albums
- Real-time updates using React Query
- Optimistic updates for better UX

Files to create:
- app/(app)/albums/page.tsx
- app/(app)/albums/new/page.tsx
- app/(app)/albums/[id]/page.tsx
- app/(app)/albums/[id]/edit/page.tsx
- components/albums/AlbumCard.tsx
- components/albums/AlbumForm.tsx
- components/albums/AlbumGallery.tsx
- lib/hooks/useAlbums.ts
- lib/validations/album.ts

Include pagination and search functionality.

### Photo Upload & Management

Create advanced photo management system for albums.

Requirements:
- Drag & drop photo upload with progress indicators
- Multiple file selection and batch upload
- Photo reordering within albums
- Photo caption editing
- Full-screen photo viewer with navigation
- EXIF data extraction (GPS, camera info, date taken)
- Image optimization (multiple sizes: thumbnail, medium, large)
- Lazy loading for performance
- Photo deletion with confirmation
- Bulk photo operations

Files to create:
- components/photos/PhotoUpload.tsx
- components/photos/PhotoGallery.tsx
- components/photos/PhotoViewer.tsx
- components/photos/PhotoCard.tsx
- lib/hooks/usePhotos.ts
- lib/utils/exifUtils.ts
- lib/utils/imageProcessing.ts
- api/photos/upload/route.ts

Use Supabase Storage with proper security policies.

### Location & EXIF Features

Add location tagging and EXIF processing to photos.

Requirements:
- Extract GPS coordinates from photo EXIF data
- Reverse geocoding (coordinates to city/country names)
- Manual location picker with map interface
- Location search with autocomplete
- Display location info on photos and albums
- Country/city aggregation for travel stats
- Privacy controls for location sharing
- Geolocation accuracy indicators

Files to create:
- components/location/LocationPicker.tsx
- components/location/LocationDisplay.tsx
- lib/hooks/useGeocoding.ts
- lib/utils/locationUtils.ts
- api/geocoding/route.ts

Integration with geocoding service (Mapbox or Google Maps).

## Day 3: 3D Globe & Polish

### 3D Globe Implementation

Create immersive 3D globe component for Adventure Log travel visualization.

Requirements:
- Interactive 3D globe using react-globe-gl and Three.js
- Display visited countries from user's photo/album data
- Country highlighting with different colors based on visit frequency
- Smooth camera animations and transitions
- Click countries to view related albums
- Touch gestures for mobile (pinch, rotate, pan)
- Mouse controls for desktop (drag, zoom, click)
- Atmospheric effects and realistic lighting
- Performance optimization for mobile devices
- Loading states and error handling
- WebGL capability detection with 2D fallback

Files to create:
- app/(app)/globe/page.tsx
- components/globe/Globe3D.tsx
- components/globe/CountryTooltip.tsx
- components/globe/GlobeControls.tsx
- lib/hooks/useGlobeData.ts
- lib/utils/globeUtils.ts

Focus on smooth 60fps performance and mobile optimization.

### Travel Statistics & Dashboard

Build travel statistics dashboard and user dashboard.

Requirements:
- Personal dashboard with key stats and recent albums
- Travel statistics: countries visited, cities explored, photos uploaded
- Interactive charts showing travel timeline
- Recent activity feed
- Quick actions (new album, upload photos)
- Travel goals and progress tracking
- Beautiful data visualizations
- Mobile-responsive layout

Files to create:
- app/(app)/dashboard/page.tsx
- components/dashboard/TravelStats.tsx
- components/dashboard/RecentActivity.tsx
- components/dashboard/QuickActions.tsx
- components/charts/TravelChart.tsx
- lib/hooks/useTravelStats.ts

Use recharts for data visualization.

### Final Polish & Deployment

Polish Adventure Log for production deployment.

Requirements:
- Responsive design review across all pages
- Loading states and error boundaries everywhere
- Image optimization and lazy loading
- Performance optimization (bundle analysis, Core Web Vitals)
- SEO optimization with proper meta tags
- Error tracking setup with Sentry
- Analytics integration
- Security audit and validation
- Accessibility testing and improvements
- Cross-browser testing
- Deploy to Vercel with proper environment variables

Tasks:
- Performance audit and optimization
- Security review and hardening
- Accessibility compliance check
- Mobile experience testing
- Production deployment setup
- Monitoring and analytics integration

Ensure production-ready quality and performance.

## Debugging Prompts

### Authentication Issues

Debug authentication problem in Adventure Log.

Issue: [describe specific problem]
Context: Using Supabase Auth with Next.js App Router
Check: RLS policies, middleware setup, auth helpers configuration
Requirements: Maintain security while fixing issue

Analyze the auth flow and provide solution with explanation.

### Performance Issues

Optimize performance for Adventure Log [specific area].

Current issues: [describe performance problems]
Target: Achieve Core Web Vitals thresholds
Context: Next.js 14 with React Query, 3D globe, image galleries
Requirements: Maintain functionality while improving performance

Provide specific optimizations with before/after metrics.

### Database Issues

Debug database/RLS issue in Adventure Log.

Problem: [describe database problem]
Context: PostgreSQL with RLS policies, Supabase Check: Row-level security policies, foreign key constraints Requirements: Maintain data security and integrity

Analyze schema and policies, provide fix with explanation.