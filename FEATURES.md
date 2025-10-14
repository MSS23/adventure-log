# Adventure Log - Features

Adventure Log is a social travel logging platform that helps you document, visualize, and share your travel adventures with an interactive 3D globe and rich photo albums.

## 🌍 Core Features

### Interactive 3D Globe Visualization
- **3D Earth Globe**: Explore your travels on a beautiful, interactive 3D globe powered by Three.js
- **Location Pins**: See all your travel destinations marked with colorful pins on the globe
- **Travel Routes**: Visualize your journey with connecting lines between destinations in chronological order
- **Year Filtering**: Filter your travels by year or view all years at once
- **Chronological Timeline**: Navigate through your entire travel history in order
- **Smart Performance**: Automatic optimization based on your device's hardware capabilities
- **Click & Navigate**: Click on any pin to view album details and photos

### Travel Albums
- **Rich Photo Albums**: Create beautiful albums with multiple photos, descriptions, and metadata
- **EXIF Data Extraction**: Automatically extract GPS coordinates, camera info, and timestamps from photos
- **Location Tracking**: Each album is linked to a specific location with GPS coordinates
- **Cover Photos**: Set custom cover photos or choose from favorite photos
- **Favorite Photos**: Mark your best photos as favorites for quick access
- **Draft & Published States**: Save albums as drafts while you work on them
- **Date Ranges**: Set start and end dates for multi-day trips
- **Visibility Controls**: Make albums public, private, or friends-only

### Photo Management
- **Multiple Upload**: Upload multiple photos at once
- **Auto-Ordering**: Photos are automatically ordered by upload sequence
- **EXIF Preservation**: Camera settings, GPS data, and timestamps are preserved
- **Captions**: Add captions to individual photos
- **Lightbox Viewer**: Full-screen photo viewing with swipe navigation
- **Responsive Images**: Automatically optimized for different screen sizes
- **Cloud Storage**: Securely stored in Supabase storage

### Social Features
- **User Profiles**: Customizable profiles with avatar, bio, and display name
- **Follow System**: Follow other travelers to see their adventures
- **Privacy Controls**: Set your account to public, private, or friends-only
- **Activity Feed**: See recent albums from people you follow
- **Like & Comment**: Engage with albums through likes and comments
- **Stories**: Share ephemeral 24-hour travel moments (Instagram-style)
- **User Discovery**: Find other travelers and explore their globes

## 📱 User Interface

### Navigation
- **Top Navigation Bar**: Quick access to Feed, Globe, Albums, and Profile
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Theme Support**: Optimized color scheme for the globe interface
- **Keyboard Shortcuts**:
  - `Space` - Play/Pause globe animation
  - `R` - Reset view
  - `S` - Search locations
  - `N` - Next album
  - `P` - Previous album
  - `A` - View current album
  - Arrow keys - Navigate years

### Globe Controls
- **Search Functionality**: Quickly find specific locations
- **Zoom Controls**: Zoom in/out on the globe
- **Rotation Controls**: Auto-rotation toggle
- **Route Visibility**: Show/hide travel connection lines
- **Reset View**: Return to default globe view
- **Year Selection**: Easy year filtering with album counts

### Album Navigation
- **Chronological Browsing**: Navigate through all albums in chronological order
- **Modal Previews**: Quick photo previews when clicking globe pins
- **Direct Album Links**: Click through to full album view
- **Album Counter**: See your position (e.g., "Album 3 of 15")

## 🔐 Privacy & Security

### Account Privacy
- **Private Accounts**: Hide your content from non-followers
- **Friends-Only Mode**: Share only with approved followers
- **Public Profiles**: Make your travels discoverable by everyone
- **Follow Requests**: Approve or deny follow requests for private accounts

### Data Security
- **Row-Level Security (RLS)**: Database-level security on all tables
- **Secure Authentication**: Powered by Supabase Auth
- **Soft Deletes**: 30-day recovery window for deleted accounts
- **Password Protection**: Secure password hashing and management

## 🎨 Design & User Experience

### Visual Design
- **Instagram-Inspired**: Clean, modern interface with familiar patterns
- **Gradient Accents**: Beautiful gradients throughout the UI
- **Smooth Animations**: Polished transitions and interactions
- **Consistent Spacing**: 4px grid system for visual harmony
- **Accessibility**: Screen reader support and semantic HTML

### Performance Optimization
- **Hardware Detection**: Automatically detects GPU capabilities
- **Dynamic Quality Settings**: Adjusts globe quality based on performance
- **FPS Throttling**: Limits to 30 FPS for better battery life
- **Lazy Loading**: Images and components load on-demand
- **Caching**: Profile data cached with 5-minute TTL
- **Code Splitting**: Optimized bundle sizes

## 📊 Statistics & Insights

### Travel Stats
- **Total Locations**: Count of unique places visited
- **Total Albums**: Number of travel albums created
- **Total Photos**: Photo count across all albums
- **Years Traveled**: Number of distinct years with travels
- **Countries Visited**: Percentage of world countries explored
- **Cities Visited**: Count and percentage of major cities

### Timeline Features
- **Year-by-Year Breakdown**: See how many places visited each year
- **Journey Progress**: Track progress through your travel timeline
- **Distance Calculations**: Measure total distance traveled
- **Location Clustering**: Group nearby locations intelligently

## 🚀 Technical Features

### Progressive Web App (PWA)
- **Offline Support**: Basic functionality works offline
- **Install Prompt**: Can be installed on mobile devices
- **App Icons**: Custom icons for all platforms
- **Mobile Optimized**: Touch-friendly interface

### Real-Time Updates
- **Live Sync**: Changes appear instantly across sessions
- **Subscription System**: Real-time updates for albums and photos
- **Optimistic Updates**: Immediate UI feedback

### Data Management
- **Automatic Backups**: Data stored in Supabase cloud
- **Export Capability**: Future feature for data export
- **Batch Operations**: Efficient bulk photo uploads
- **Error Recovery**: Graceful handling of network issues

## 🎯 Use Cases

### Travel Bloggers
- Document trips with detailed albums and photos
- Share adventures with followers
- Showcase travel portfolio on interactive globe

### Vacation Memories
- Keep all trip photos organized by location
- Easily revisit past travels on the globe
- Share with family and friends

### Travel Planning
- See where you've been to plan future trips
- Visualize gaps in your travel map
- Track countries and cities visited

### Professional Travel
- Document work travels
- Track business trip locations
- Share travel experiences with colleagues

## 🔄 Recent Updates

### Globe Improvements
- ✨ Auto-optimization for better performance
- 🐛 Fixed pins not showing for "All Years" view
- ✨ Chronological album navigation
- 🎨 Cleaner UI with simplified controls

### Profile Enhancements
- 🐛 Fixed user profile lookup errors
- ✨ Better privacy controls
- 🎨 Improved error handling and messaging

### Navigation Features
- ✨ Album-based navigation from feed
- 🐛 Fixed modal jumping issues
- 🎨 Better button states and labels

## 📱 Mobile Experience

### Capacitor Integration
- Native iOS and Android apps
- Camera access for photo uploads
- Geolocation for automatic location tagging
- File system access for offline storage
- Native share functionality

### Touch Optimized
- Swipe navigation for photos
- Pinch-to-zoom on globe
- Touch-friendly buttons and controls
- Mobile-first responsive design

## 🌟 Coming Soon

- **Group Albums**: Collaborate on albums with other travelers
- **Trip Planning**: Plan future trips on the globe
- **Travel Recommendations**: Get suggestions based on your history
- **Export Options**: Download your data in various formats
- **Advanced Stats**: More detailed travel analytics
- **Integration**: Connect with other travel platforms
- **Itinerary Builder**: Create detailed travel itineraries
- **Budget Tracking**: Track travel expenses per trip

---

**Built with**: Next.js 15, TypeScript, Supabase, Tailwind CSS, Three.js, React Globe GL

**Platform**: Web, iOS, Android (via Capacitor)
