# 🌍 Adventure Log

[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E)](https://supabase.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4-FF6600)](https://capacitorjs.com/)

Transform your journeys into beautiful, shareable stories with Adventure Log - the cross-platform social travel platform that brings your adventures to life on web, Android, and iOS.

## ✨ Features

### 🎯 Core Features
- **Beautiful Photo Albums**: Create stunning visual stories of your travels
- **Interactive Globe**: Explore your adventures on a 3D world map with flight animations
- **Social Feed**: Instagram-style social experience for sharing adventures
- **Smart Organization**: Auto-organize photos by location and date
- **Cross-Platform**: Seamless experience on web, Android, and iOS

### 📱 Advanced Capabilities
- **Location Intelligence**: Automatic location tagging and mapping
- **Travel Timeline**: Visualize your journey chronologically
- **Photo Management**: Upload, organize, and edit your travel memories
- **Social Features**: Follow friends, like posts, and share experiences
- **Mobile-Native**: Camera access, GPS tracking, native sharing

### 🚀 Production Features
- **Production-Ready Architecture**: Optimized Next.js 15 with App Router
- **Advanced Security**: Row-level security, input validation, CSRF protection
- **Performance Optimized**: Bundle splitting, image optimization, caching
- **SEO Optimized**: Comprehensive meta tags, Open Graph, structured data
- **PWA Support**: Progressive Web App with offline capabilities
- **Mobile Apps**: Native Android and iOS applications via Capacitor

## 🏗️ Architecture

Adventure Log is built with modern web technologies for optimal performance and scalability:

### Frontend Stack
- **Next.js 15** - React framework with App Router and Turbopack
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Modern utility-first styling
- **Framer Motion** - Smooth animations and micro-interactions
- **React Query** - Server state management
- **Globe.GL** - Interactive 3D globe visualization

### Backend & Database
- **Supabase** - PostgreSQL database with real-time features
- **Authentication** - Secure user management with social logins
- **Storage** - Optimized image hosting and processing
- **RLS** - Row-level security for data protection
- **Edge Functions** - Serverless API endpoints

### Mobile Platform
- **Capacitor** - Cross-platform native mobile deployment
- **Native Plugins** - Camera, geolocation, filesystem, sharing
- **PWA Support** - Progressive web app capabilities
- **Platform Detection** - Smart feature adaptation per platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git
- For mobile: Android Studio and/or Xcode

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MSS23/adventure-log.git
   cd adventure-log
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials:
   # NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up the database**
   ```bash
   # First run the deployment fix to clean up any conflicts
   # In your Supabase SQL editor, run:
   # database/deployment-fix.sql

   # Then run the main schema:
   # database/production-schema.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your Adventure Log in action!

## 📱 Mobile Development

Adventure Log provides a unified codebase that builds for web, Android, and iOS using Capacitor.

### Building for Mobile

1. **Build the web app for mobile**
   ```bash
   npm run mobile:build
   ```

2. **Sync with Capacitor platforms**
   ```bash
   npm run mobile:sync
   ```

3. **Run on device/simulator**
   ```bash
   # For Android
   npm run mobile:run:android

   # For iOS
   npm run mobile:run:ios

   # Or open in IDE
   npm run mobile:open:android
   npm run mobile:open:ios
   ```

### Mobile-Specific Features
- **Native Camera**: Direct camera access for photo capture
- **GPS Location**: Precise location tracking for travel logs
- **File System**: Local storage for offline capabilities
- **Native Sharing**: Platform-specific sharing menus
- **Background Processing**: Location updates while app is backgrounded
- **Push Notifications**: Real-time engagement notifications (coming soon)

### Platform Detection
The app automatically detects the platform and adapts features:

```typescript
import { Platform } from '@/lib/utils/platform'

// Check platform
if (Platform.isNative()) {
  // Use native camera
} else {
  // Use web file input
}

// Platform-specific execution
withPlatform({
  android: () => handleAndroid(),
  ios: () => handleIOS(),
  web: () => handleWeb()
})
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production web deployment
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run Jest test suite
- `npm run mobile:build` - Build optimized version for mobile platforms
- `npm run mobile:sync` - Sync web build with Capacitor platforms
- `npm run mobile:run:android` - Build and run on Android device/emulator
- `npm run mobile:run:ios` - Build and run on iOS device/simulator

### Project Structure

```
adventure-log/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Authenticated app pages
│   │   ├── (auth)/            # Authentication pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── auth/             # Authentication components
│   │   ├── globe/            # 3D globe and mapping
│   │   ├── photos/           # Photo management
│   │   └── search/           # Search and filtering
│   ├── lib/                   # Utilities and configurations
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── contexts/         # React contexts
│   │   └── supabase/         # Database client
│   ├── types/                 # TypeScript type definitions
│   └── tests/                 # Test files
├── public/                    # Static assets
├── database/                  # Database schemas and fixes
├── android/                   # Android Capacitor platform
├── ios/                      # iOS Capacitor platform
├── scripts/                  # Build and deployment scripts
└── docs/                     # Additional documentation
```

### Key Features Implementation

#### 🌐 Interactive Globe
- **3D Visualization**: WebGL-powered globe with travel data
- **Flight Animations**: Animated flight paths between locations
- **Location Clustering**: Smart grouping of nearby travel points
- **Photo Integration**: Click locations to view associated photos

#### 📸 Photo Management
- **Multi-platform Upload**: Native camera on mobile, file picker on web
- **EXIF Processing**: Automatic location and date extraction
- **Smart Albums**: Auto-categorization by location and trip
- **Optimized Storage**: Multiple size variants for performance

#### 📱 Social Features
- **Instagram-style Feed**: Story-like interface for sharing adventures
- **Real-time Interactions**: Live likes, comments, and follows
- **Story Sharing**: Temporary stories that disappear after 24 hours
- **Privacy Controls**: Granular sharing and visibility settings

## 🌐 Deployment

### Web Deployment (Vercel Recommended)

1. **Connect repository to Vercel**
   ```bash
   npx vercel
   ```

2. **Configure environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your deployment URL)

3. **Deploy to production**
   ```bash
   npx vercel --prod
   ```

### Mobile App Store Deployment

#### Android (Google Play Console)

1. **Generate signed build**
   ```bash
   npm run mobile:build
   npx cap sync android
   npx cap open android
   ```

2. **In Android Studio:**
   - Build → Generate Signed Bundle/APK
   - Select Android App Bundle (AAB)
   - Upload to Google Play Console

#### iOS (App Store Connect)

1. **Generate iOS build**
   ```bash
   npm run mobile:build
   npx cap sync ios
   npx cap open ios
   ```

2. **In Xcode:**
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload to App Store Connect

### Database Deployment

The database schema is managed through Supabase. Run these in order:

1. **Apply deployment fix** (resolves function conflicts):
   ```sql
   -- Run database/deployment-fix.sql in Supabase SQL Editor
   ```

2. **Apply main schema**:
   ```sql
   -- Run database/production-schema.sql in Supabase SQL Editor
   ```

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Testing Strategy
- **Unit Tests**: Component logic and utility functions
- **Integration Tests**: API endpoints and database operations
- **Cross-Platform Tests**: Feature parity between web and mobile
- **Visual Regression**: UI consistency across platforms
- **Performance Tests**: Load times and responsiveness

### Mobile Testing
```bash
# Test on real devices
npm run mobile:run:android
npm run mobile:run:ios

# Test specific features
npm test -- --grep "mobile"
npm test -- --grep "platform"
```

## 📊 Performance & Security

### Performance Optimizations
- **Bundle Size Optimization**: Automatic code splitting and tree shaking
- **Image Optimization**: WebP/AVIF conversion with responsive sizing
- **Caching Strategy**: Aggressive caching with cache invalidation
- **CDN Ready**: Static asset optimization for global distribution
- **Database Optimization**: Efficient queries with proper indexing
- **Memory Management**: Optimized React components with proper cleanup

### Security Features
- **Authentication**: Secure session management with Supabase Auth
- **Authorization**: Row-level security policies in database
- **Input Validation**: Comprehensive validation with Zod schemas
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Security Headers**: Comprehensive security headers configuration
- **Rate Limiting**: API rate limiting and abuse prevention

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/adventure-log.git
   cd adventure-log
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make changes and test**
   ```bash
   npm run dev
   npm test
   npm run type-check
   npm run lint
   ```

4. **Test mobile builds**
   ```bash
   npm run mobile:build
   npm run mobile:sync
   ```

5. **Commit and push**
   ```bash
   git commit -m 'feat: add amazing feature'
   git push origin feature/amazing-feature
   ```

6. **Create Pull Request**

### Code Standards
- TypeScript for type safety
- ESLint configuration for consistent style
- Conventional commits for clear history
- Test coverage for new features
- Mobile compatibility for all UI changes

## 📋 Roadmap

### 🎯 Short-term Goals
- [ ] Push notifications for mobile apps
- [ ] Offline photo upload queue
- [ ] Advanced photo editing tools
- [ ] Travel expense tracking
- [ ] Weather data integration

### 🚀 Long-term Vision
- [ ] AI-powered travel recommendations
- [ ] Collaborative trip planning
- [ ] Integration with booking platforms
- [ ] AR features for location discovery
- [ ] Desktop applications (Electron)
- [ ] Public API for third-party integrations

### 🌍 Platform Expansions
- [ ] Apple Watch companion app
- [ ] Browser extensions for travel planning
- [ ] Smart TV applications
- [ ] Voice assistant integration

## 🆘 Support & Troubleshooting

### Common Issues

**PWA Manifest 401 Errors**
- Ensure manifest routes are excluded from auth in `middleware.ts`
- Check `/manifest.webmanifest` loads without authentication

**Globe Not Showing Pins (400 Errors)**
- Apply database migration: `database/deployment-fix.sql`
- Verify RPC functions exist in Supabase dashboard

**Mobile Build Issues**
- Ensure Node.js version 18+
- Run `npm run mobile:sync` after code changes
- Check Capacitor configuration in `capacitor.config.ts`

**Database Conflicts**
- Run `database/deployment-fix.sql` to resolve function conflicts
- Ensure RPC functions are properly deployed

### Getting Help
- **GitHub Issues**: [Report bugs and request features](https://github.com/MSS23/adventure-log/issues)
- **Discussions**: [Community support and questions](https://github.com/MSS23/adventure-log/discussions)
- **Documentation**: Comprehensive guides in `/docs` folder
- **Email**: Technical support at support@adventurelog.app

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Special thanks to the amazing open-source community:

- **[Supabase](https://supabase.com)** - Backend platform and database
- **[Vercel](https://vercel.com)** - Deployment and hosting
- **[Next.js](https://nextjs.org)** - React framework
- **[Capacitor](https://capacitorjs.com)** - Cross-platform mobile development
- **[Globe.GL](https://globe.gl)** - 3D globe visualization
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **All our contributors** who make this project possible

---

**Adventure Log** - Transform your journeys into beautiful, shareable stories.

Built with ❤️ by travelers, for travelers. 🌍✈️📸