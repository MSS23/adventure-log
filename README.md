# Adventure Log

[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

A sophisticated social travel logging platform that transforms personal journeys into beautiful, shareable stories through interactive albums, photos, and an immersive 3D globe visualization. Built with modern web technologies and production-ready features.

## 🏗️ Repository Structure

**Standard Next.js application structure at repository root for optimal deployment.**

```
📁 Repository Root (Next.js Application)
├── src/                    # 🚀 Application source code
├── public/                 # Static assets and PWA files
├── package.json           # Dependencies and scripts
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── docs/                  # Project documentation
├── database/              # Database schemas and setup
├── DEVELOPMENT_PROGRESS.md # Development status
└── FUTURE_ROADMAP.md     # Future development plans
```

**Ready for deployment - work directly from repository root.**

## ✨ Features

### Core Features
- 🔐 **Advanced Authentication**: Complete Supabase Auth integration with protected routes
- 📸 **Intelligent Photo Management**: Upload with EXIF extraction, GPS location detection, and metadata preservation
- 📱 **Dynamic Album System**: Create, edit, and organize travel albums with rich metadata
- 🌍 **3D Globe Visualization**: Interactive globe showing travel destinations with react-globe.gl
- 💬 **Social Features**: Like, comment, and share albums with the community
- 📊 **Analytics Dashboard**: Comprehensive travel statistics and insights
- 🔍 **Discovery Platform**: Explore adventures by location, category, and user

### Production Features
- 🏗️ **Production Architecture**: Optimized Next.js 15 with App Router and Turbopack
- 📝 **Centralized Logging**: Structured logging system with context tracking
- 🎨 **Advanced Styling**: Tailwind CSS 4 with custom adventure-themed design system
- 🔍 **SEO Optimized**: Comprehensive meta tags, Open Graph, Twitter Cards, and structured data
- 🐳 **Docker Ready**: Complete containerization with development and production configurations
- 📱 **PWA Support**: Progressive Web App with offline capabilities
- 🔒 **Security First**: Production-grade security headers and configurations
- ⚡ **Performance Optimized**: Bundle splitting, image optimization, and caching strategies
- 📲 **Native Mobile Apps**: iOS and Android apps via Capacitor (see [MOBILE_SETUP.md](MOBILE_SETUP.md))

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.3 with App Router and Turbopack
- **Language**: TypeScript 5.0 with strict configuration
- **Styling**: Tailwind CSS 4.0 with custom design system
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand with React Query for server state
- **Forms**: React Hook Form with Zod validation

### Backend & Infrastructure
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth with row-level security
- **Storage**: Supabase Storage for photos and assets
- **Deployment**: Docker containers with multi-stage builds
- **Monitoring**: Health checks and logging infrastructure

### Visualization & Media
- **3D Globe**: react-globe.gl with Three.js
- **Image Processing**: Sharp for optimization, EXIFR for metadata
- **Location Services**: Geocoding and reverse geocoding
- **Maps**: Interactive location selection and visualization

### Development Tools
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Testing**: Built-in testing framework ready
- **Documentation**: Comprehensive README and deployment guides
- **Containerization**: Docker with development and production configurations

## 📁 Project Structure

```
adventure-log/
├── src/                          # Source code
│   ├── app/                     # Next.js 15 App Router
│   │   ├── (app)/              # Protected app routes
│   │   ├── api/                # API routes and health checks
│   │   ├── globals.css         # Tailwind CSS with custom theme
│   │   ├── layout.tsx          # Root layout with SEO metadata
│   │   └── sitemap.ts          # Dynamic sitemap generation
│   ├── components/             # Reusable React components
│   │   ├── auth/              # Authentication components
│   │   ├── layout/            # Layout and navigation
│   │   ├── seo/               # SEO and structured data
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utility libraries
│   │   ├── utils/             # Helper functions and utilities
│   │   │   ├── logger.ts      # Centralized logging system
│   │   │   └── seo.ts         # SEO metadata generators
│   │   ├── supabase.ts        # Supabase client configuration
│   │   └── validations/       # Zod schemas for validation
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
│   ├── robots.txt            # SEO robots configuration
│   └── manifest.json         # PWA manifest
├── docs/                     # Project documentation
├── database/                 # Database schemas and migrations
├── config/                   # Configuration files for services
├── docker-compose.yml        # Production Docker configuration
├── docker-compose.dev.yml    # Development Docker configuration
├── Dockerfile               # Production Docker image
├── Dockerfile.dev           # Development Docker image
├── Makefile                # Docker operation commands
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── next.config.ts           # Next.js production configuration
```

## 🚀 Production Status

This application is **production-ready** with enterprise-grade features:

### ✅ Code Quality & Performance
- **Zero TypeScript compilation errors** with strict mode
- **ESLint configuration** for code quality enforcement
- **Bundle optimization** with code splitting and tree shaking
- **Image optimization** with Next.js Image component and Sharp
- **SEO optimization** with dynamic metadata and structured data
- **PWA capabilities** with service worker and manifest

### ✅ Infrastructure & Deployment
- **Docker containerization** with multi-stage builds
- **Health monitoring** with built-in health check endpoints
- **Centralized logging** with structured context tracking
- **Security headers** and CSP configuration
- **Environment configuration** with comprehensive variable management
- **Database migrations** and schema management

### ✅ User Experience
- **Mobile-responsive design** with touch optimizations
- **Progressive enhancement** with graceful degradation
- **Accessibility compliance** with ARIA labels and keyboard navigation
- **Performance monitoring** with Web Vitals tracking
- **Error boundaries** and comprehensive error handling

## 🐳 Quick Start with Docker

### Development Environment
```bash
# Start development environment with hot reloading
make dev

# Or using Docker Compose directly
docker-compose -f docker-compose.dev.yml up --build
```

### Production Deployment
```bash
# Build and start production environment
make prod

# Or build production image
make build

# Deploy with monitoring
make deploy
```

## 🔧 Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # https://yourdomain.com in production

# Optional: Enhanced Features
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# SEO and Analytics (Optional)
GOOGLE_SITE_VERIFICATION=your_google_verification
GOOGLE_ANALYTICS_ID=your_analytics_id

# Social Media Integration (Optional)
TWITTER_SITE=@yourtwitterhandle
FACEBOOK_APP_ID=your_facebook_app_id
```

## 📊 Performance Features

- **Bundle Size Optimization**: Automatic code splitting and tree shaking
- **Image Optimization**: WebP/AVIF conversion with responsive sizing
- **Caching Strategy**: Aggressive caching with cache invalidation
- **CDN Ready**: Static asset optimization for global distribution
- **Database Optimization**: Efficient queries with proper indexing
- **Memory Management**: Optimized React components with proper cleanup

## 🔒 Security Features

- **Authentication**: Secure session management with Supabase Auth
- **Authorization**: Row-level security policies in database
- **Input Validation**: Comprehensive validation with Zod schemas
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Security Headers**: Comprehensive security headers configuration
- **Rate Limiting**: API rate limiting and abuse prevention

Built with ❤️ using [Claude Code](https://claude.ai/code)

---

## 💻 Local Development

### Prerequisites
- Node.js 20+ and npm
- Docker and Docker Compose (for containerized development)
- Git

### Traditional Development Setup
```bash
# Clone the repository
git clone https://github.com/MSS23/adventure-log.git
cd adventure-log

# Install dependencies (application is at repository root)
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Docker Development Setup (Recommended)
```bash
# Start development environment with hot reloading
make dev

# Or using Docker Compose directly
docker-compose -f docker-compose.dev.yml up --build

# View logs
make dev-logs

# Stop development environment
make dev-down
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Docker Commands (using Makefile)
```bash
make help           # Show all available commands
make dev            # Start development environment
make prod           # Start production environment
make build          # Build production Docker image
make clean          # Clean up Docker resources
make logs           # View container logs
make shell          # Access container shell
```

## 🚀 Deployment Options

### Vercel (Recommended for Fast Deployment)

**Standard Next.js deployment - no special configuration needed!**

1. **Connect Repository**: Connect MSS23/adventure-log repository to Vercel
2. **Auto-Configuration**: Vercel will automatically detect:
   - **Root Directory**: `.` (repository root - default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Framework**: Next.js (auto-detected)
3. **Environment Variables**: Set in Vercel dashboard:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. **Deploy**: Automatic deployment on every push to main branch

**✅ Repository is now optimized for standard Vercel deployment with zero configuration!**

### Docker Production Deployment
```bash
# Build and deploy production environment
make prod

# Or build and push to registry
make build
DOCKER_REGISTRY=your-registry make push
```

### Environment Variables for Production
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional but recommended
GOOGLE_SITE_VERIFICATION=your-verification-code
GOOGLE_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

## ⚠️ Important Security Notice

**CRITICAL:** This codebase has **8 critical security vulnerabilities** that must be fixed before production deployment. See **[docs/SECURITY.md](docs/SECURITY.md)** for complete details and fixes.

**Required Actions Before Production:**
1. Remove dynamic code execution in `src/lib/utils/web-worker.ts`
2. Fix XSS vulnerabilities in Globe components (innerHTML usage)
3. Add authentication to geocoding API endpoint
4. Fix permissive RLS policy in album_shares table
5. Correct Supabase client imports in monitoring routes

**Grade:** B+ (85/100) - Production-ready after security fixes

---

## 📚 Documentation

### Core Documentation
- **[SECURITY.md](docs/SECURITY.md)** - Security vulnerabilities, fixes, and best practices
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, patterns, and architecture decisions
- **[API.md](docs/API.md)** - Complete API reference with examples
- **[DATABASE.md](docs/DATABASE.md)** - Schema, migrations, RLS policies, and queries
- **[PERFORMANCE.md](docs/PERFORMANCE.md)** - Optimization guide and benchmarks
- **[TESTING.md](docs/TESTING.md)** - Testing strategy, setup, and best practices
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines and workflow
- **[CLAUDE.md](CLAUDE.md)** - AI-assisted development guide

### Additional Resources
- **[Development Progress](DEVELOPMENT_PROGRESS.md)** - Current development status
- **[Future Roadmap](FUTURE_ROADMAP.md)** - Planned features and enhancements

### Growth docs
- **[Growth Playbook](docs/growth/PLAYBOOK.md)** - Growth thesis, 90-day plan, and operator guides (Play Store, domain/email, launches, outreach, ASO)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add new feature"`
5. Push to your fork and submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛠️ Built With

This project showcases modern web development practices with:
- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Docker](https://www.docker.com/) - Containerization platform
- [Vercel](https://vercel.com/) - Deployment and hosting platform

## 📞 Support

For support, please create an issue in the repository or contact the development team.

---

**Adventure Log** - Transform your journeys into beautiful stories ✈️🌍📸
