# Adventure Log - Developer Guide

## Overview

Adventure Log is a comprehensive social travel logging platform built with modern web technologies. This guide provides everything you need to know to set up, develop, and maintain the application.

## 🚀 Quick Start (< 10 minutes)

### Prerequisites

- **Node.js** 20+ and **pnpm** (package manager)
- **PostgreSQL** database (local or cloud)
- **Supabase** account for file storage
- **Google OAuth** credentials

### 1. Clone and Install

```bash
git clone <repository-url>
cd adventure-log
pnpm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure your `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/adventure_log"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_BUCKET="photos"

# Application
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:push

# Seed with demo data
pnpm db:seed
```

### 4. Start Development

```bash
pnpm dev
```

Visit `http://localhost:3000` and sign in with the seeded demo user:

- Email: `demo@example.com`
- Password: `DemoPassword123!`

## 📋 Architecture Overview

### Tech Stack

| Layer                | Technology              | Purpose                                   |
| -------------------- | ----------------------- | ----------------------------------------- |
| **Framework**        | Next.js 15 + App Router | Full-stack React framework                |
| **Database**         | PostgreSQL + Prisma     | Relational database with type-safe ORM    |
| **Authentication**   | NextAuth.js             | OAuth + credentials authentication        |
| **Styling**          | Tailwind CSS + Radix UI | Utility-first CSS + accessible components |
| **3D Graphics**      | React Three Fiber       | Interactive 3D globe visualization        |
| **State Management** | TanStack Query          | Server state management                   |
| **File Storage**     | Supabase Storage        | Scalable file uploads                     |
| **Testing**          | Jest + Playwright       | Unit and E2E testing                      |
| **Deployment**       | Vercel                  | Serverless deployment platform            |

### Key Features Implemented

✅ **Core Features**

- User authentication (OAuth + credentials)
- Travel album creation and management
- Photo uploads with EXIF privacy controls
- Interactive 3D globe with country visualization
- 2D map fallback for accessibility

✅ **Social Features**

- Follow/unfollow system
- Friend requests and connections
- Likes, comments, and favorites
- Activity feed and notifications
- Privacy controls (public, friends-only, private)

✅ **Gamification**

- Badge system with progress tracking
- Time-bound challenges and leaderboards
- Points and achievement system
- User statistics and streaks

✅ **Performance & Security**

- Progressive Web App (PWA) with offline support
- Content Security Policy (CSP) and security headers
- Content moderation and abuse prevention
- Bundle size budgets and performance monitoring
- Database query optimization

✅ **Compliance & Quality**

- GDPR-compliant data export and deletion
- Comprehensive error tracking and logging
- Automated backups and recovery procedures
- End-to-end testing with Playwright
- Accessibility compliance (WCAG guidelines)

## 🏗️ Project Structure

```
adventure-log/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── (protected)/              # Protected user routes
│   ├── api/                      # API endpoints
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # Base UI components (Shadcn)
│   ├── features/                 # Feature-specific components
│   ├── layout/                   # App layout components
│   ├── providers/                # Context providers
│   └── globe/                    # 3D globe components
├── lib/                          # Utility libraries
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Database client
│   ├── validations.ts            # Zod schemas
│   ├── badges.ts                 # Gamification logic
│   ├── challenges.ts             # Challenge system
│   ├── moderation.ts            # Content moderation
│   ├── http.ts                  # API utilities
│   └── rate-limit.ts            # Rate limiting
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── e2e/                         # Playwright tests
├── scripts/                     # Development scripts
├── docs/                        # Documentation
└── public/                      # Static assets
```

## 🛠️ Development Workflow

### Available Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `pnpm dev`        | Start development server with Turbopack   |
| `pnpm build`      | Build for production with bundle analysis |
| `pnpm start`      | Start production server                   |
| `pnpm lint`       | Run ESLint with auto-fix                  |
| `pnpm type-check` | TypeScript compilation check              |
| `pnpm format`     | Format code with Prettier                 |

### Database Commands

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `pnpm db:generate` | Generate Prisma client            |
| `pnpm db:push`     | Push schema to database           |
| `pnpm db:migrate`  | Create and apply migration        |
| `pnpm db:seed`     | Seed database with demo data      |
| `pnpm db:studio`   | Open Prisma Studio                |
| `pnpm db:reset`    | Reset database completely         |
| `pnpm db:analyze`  | Run database performance analysis |

### Testing Commands

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `pnpm test`          | Run unit tests                  |
| `pnpm test:e2e`      | Run Playwright E2E tests        |
| `pnpm test:coverage` | Generate test coverage report   |
| `pnpm test:api`      | Test API endpoints specifically |

### Performance Analysis

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `pnpm analyze:bundle` | Analyze bundle sizes and budgets |
| `pnpm db:performance` | Check database query performance |

## 🎨 Component Development

### UI Component Guidelines

We use **Shadcn/UI** components with **Radix UI** primitives:

```tsx
// Example: Custom travel album component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{album.title}</CardTitle>
          <Badge variant={getPrivacyVariant(album.privacy)}>
            {album.privacy}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{album.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">
            📍 {album.city}, {album.country}
          </span>
          <Button variant="outline" size="sm">
            View Album
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Globe Component Architecture

The 3D globe uses **React Three Fiber** with performance tiers:

```tsx
// Simplified globe component structure
export function Globe({ albums }: { albums: Album[] }) {
  const { tier } = usePerformanceTier();

  return (
    <Canvas>
      <Suspense fallback={<GlobeLoader />}>
        {tier === "high" ? (
          <EnhancedGlobe albums={albums} />
        ) : tier === "medium" ? (
          <StandardGlobe albums={albums} />
        ) : (
          <MapFallback albums={albums} />
        )}
      </Suspense>
    </Canvas>
  );
}
```

## 🗃️ Database Schema

### Core Models

```prisma
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  username             String?  @unique
  name                 String?
  role                 UserRole @default(USER)

  // Travel statistics
  totalCountriesVisited Int      @default(0)
  totalAlbumsCount     Int      @default(0)
  totalPhotosCount     Int      @default(0)
  currentStreak        Int      @default(0)

  // Relations
  albums               Album[]
  badges               UserBadge[]
  activities           Activity[]
  followers            Follow[] @relation("UserFollowers")
  following            Follow[] @relation("UserFollowing")
}

model Album {
  id           String    @id @default(cuid())
  title        String
  description  String?
  country      String
  countryCode  String?   // ISO-3166 alpha-2
  city         String?
  latitude     Float     @default(0)
  longitude    Float     @default(0)
  privacy      Privacy   @default(PUBLIC)
  shareLocation Boolean  @default(false)
  deletedAt    DateTime? // Soft delete

  userId       String
  user         User      @relation(fields: [userId], references: [id])
  photos       AlbumPhoto[]

  @@index([userId, createdAt])
  @@index([country, privacy])
  @@index([privacy, createdAt])
}
```

### Database Indexes

Critical indexes for performance:

- `User`: `(email)`, `(username)`
- `Album`: `(userId, createdAt)`, `(country, privacy)`, `(privacy, createdAt)`
- `AlbumPhoto`: `(albumId, createdAt)`, `(deletedAt, createdAt)`
- `Activity`: `(userId, createdAt)`, `(createdAt DESC)`
- `Follow`: `(followerId, followingId)`
- `Like`: `(userId, targetType, targetId)`

## 🔐 Authentication & Authorization

### NextAuth Configuration

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      async authorize(credentials) {
        // Email/password authentication with bcrypt
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.userId,
        role: token.role,
      },
    }),
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
};
```

### Route Protection

```typescript
// middleware.ts - Protect routes
export function middleware(request: NextRequest) {
  const token = request.nextUrl.pathname.startsWith("/api/")
    ? request.headers.get("authorization")
    : request.cookies.get("next-auth.session-token")?.value;

  if (!token && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}
```

### API Authorization

```typescript
// Example protected API route
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); // Throws if not authenticated

  // Check ownership for user-specific resources
  const album = await db.album.findFirst({
    where: { id: albumId, userId: user.id },
  });

  if (!album) {
    return forbidden("Access denied");
  }

  return ok(album);
}
```

## 📱 Progressive Web App (PWA)

### Service Worker Features

```javascript
// public/sw.js - Key features
const CACHE_NAME = "adventure-log-v7";

// Caching strategies
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) {
    // API: Network first with cache fallback
    event.respondWith(handleApiRequest(event.request));
  } else if (event.request.url.match(/\.(js|css|png|jpg)$/)) {
    // Static assets: Cache first
    event.respondWith(handleStaticAsset(event.request));
  } else {
    // Pages: Network first with offline fallback
    event.respondWith(handlePageRequest(event.request));
  }
});

// Background sync for uploads
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") {
    event.waitUntil(syncPhotoUploads());
  }
});
```

### Manifest Configuration

```json
{
  "name": "Adventure Log",
  "short_name": "AdventureLog",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "New Album",
      "url": "/albums/new",
      "description": "Create a new travel album"
    }
  ]
}
```

## 🎮 Gamification System

### Badge Engine

```typescript
// lib/badges.ts
export async function checkAndAwardBadges(context: BadgeCheckContext) {
  const { userId, triggerType } = context;

  // Get user's current progress
  const stats = await getUserStats(userId);

  // Check each eligible badge
  for (const badge of eligibleBadges) {
    const progress = calculateProgress(badge, stats);

    if (progress >= badge.requirement) {
      await awardBadge(userId, badge.id);

      // Create notification
      await createNotification(userId, {
        type: "BADGE_EARNED",
        title: "Badge Unlocked! 🏆",
        content: `You've earned the "${badge.name}" badge!`,
      });
    }
  }
}
```

### Challenge System

```typescript
// lib/challenges.ts
export async function createActiveChallenges() {
  const now = new Date();

  // Create monthly challenges
  if (now.getDate() === 1) {
    await createMonthlyChallenge(now);
  }

  // Create weekly challenges (every Monday)
  if (now.getDay() === 1) {
    await createWeeklyChallenge(now);
  }
}
```

## 🛡️ Security Implementation

### Content Security Policy

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co",
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];
```

### Input Validation

```typescript
// lib/validations.ts
export const createAlbumSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  country: z.string().min(1),
  city: z.string().max(100).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]),
  shareLocation: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Usage in API routes
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validatedData = createAlbumSchema.parse(body); // Throws on invalid data
  // ... continue with valid data
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
const limiter = new RateLimiter({
  intervals: {
    "/api/auth/*": { requests: 5, window: "1m" },
    "/api/uploads/*": { requests: 10, window: "1m" },
    "/api/comments/*": { requests: 20, window: "1m" },
  },
});

export async function rateLimit(request: NextRequest) {
  const identifier = getIdentifier(request);
  const result = await limiter.check(identifier, request.url);

  if (!result.success) {
    throw new Error(`Rate limit exceeded. Try again in ${result.retryAfter}ms`);
  }
}
```

## 📊 Performance Monitoring

### Bundle Analysis

```bash
# Analyze bundle sizes
pnpm analyze:bundle

# Example output:
📦 JavaScript Bundles:
✅ main-ABC123.js: 180KB gzipped (Budget: 200KB)
✅ vendor-XYZ789.js: 120KB gzipped (Budget: 150KB)
⚠️  globe-component.js: 140KB gzipped (Budget: 150KB - 93% used)

📈 Total Bundle Sizes:
✅ Total JavaScript: 620KB / 800KB (78%)
✅ Total CSS: 45KB / 100KB (45%)
```

### Database Performance

```bash
# Test database performance
pnpm db:performance

# Example output:
⚡ Running Performance Tests...

🚀 User Dashboard Data: 89.23ms - ACCEPTABLE
🚀 Album Feed Query: 45.67ms - FAST
🚀 Social Feed Query: 123.45ms - ACCEPTABLE
⚠️  Search Albums Query: 340ms - SLOW

💡 Recommendations:
• Consider adding index on (privacy, deletedAt, createdAt) for Album table
• Implement search caching for frequently searched terms
```

## 🧪 Testing Strategy

### Unit Tests (Jest)

```typescript
// __tests__/lib/badges.test.ts
import { checkAndAwardBadges } from "@/lib/badges";
import { db } from "@/lib/db";

describe("Badge System", () => {
  it("should award badge when requirements are met", async () => {
    const mockUser = await createTestUser({
      totalCountriesVisited: 5,
    });

    const result = await checkAndAwardBadges({
      userId: mockUser.id,
      triggerType: "COUNTRY_VISITED",
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Explorer");
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/tests/album-creation.spec.ts
test("should create album with photos", async ({ page }) => {
  await helpers.navigateToPage("/albums/new");

  // Fill album details
  await helpers.fillField("title", "Test Album");
  await helpers.fillField("country", "United States");
  await helpers.selectOption("privacy", "PUBLIC");

  await helpers.clickButton("Create Album");

  // Verify album was created
  await helpers.verifySuccessMessage();
  await expect(page).toHaveURL(/.*\/albums\/[a-zA-Z0-9]+/);
});
```

### API Testing

```typescript
// __tests__/api/albums.test.ts
describe("/api/albums", () => {
  it("should create album with valid data", async () => {
    const response = await request(app)
      .post("/api/albums")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Test Album",
        country: "United States",
        privacy: "PUBLIC",
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Test Album");
  });
});
```

## 🚀 Deployment Guide

### Production Environment Variables

```bash
# Production .env
DATABASE_URL="postgresql://user:pass@prod-db.com/adventure_log"
NEXTAUTH_URL="https://adventurelog.app"
NEXTAUTH_SECRET="production-secret"

# Supabase Production
NEXT_PUBLIC_SUPABASE_URL="https://prod-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="prod-service-role-key"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
UPSTASH_REDIS_REST_URL="https://your-redis-url"
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... add all production env vars
```

### Database Migration in Production

```bash
# Generate migration
npx prisma migrate dev --name "add-new-feature"

# Deploy to production database
npx prisma migrate deploy
```

### Production Checklist

✅ **Security**

- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Database access restricted

✅ **Performance**

- [ ] Bundle budgets under limits
- [ ] Database indexes optimized
- [ ] CDN configured for static assets
- [ ] Images optimized and compressed

✅ **Monitoring**

- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] Database backup automated
- [ ] Health checks implemented

✅ **Compliance**

- [ ] GDPR data export/deletion tested
- [ ] Privacy policy updated
- [ ] Terms of service current
- [ ] Security headers validated

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**

```bash
# Check database connection
npx prisma db pull

# Reset database if needed
pnpm db:reset
```

**Build Failures**

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
pnpm install
```

**TypeScript Errors**

```bash
# Regenerate Prisma client
pnpm db:generate

# Check types
pnpm type-check
```

**Globe Not Rendering**

- Check browser WebGL support
- Verify Three.js/R3F compatibility
- Check console for errors
- Test with 2D map fallback

### Debug Mode

```bash
# Enable debug logging
DEBUG=adventure-log:* pnpm dev

# Database query logging
DATABASE_LOGGING=true pnpm dev

# Verbose error reporting
VERBOSE_ERRORS=true pnpm dev
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow the coding standards:
   - Use TypeScript strict mode
   - Follow ESLint configuration
   - Write tests for new features
   - Update documentation

### Code Standards

```typescript
// Use explicit types
interface AlbumData {
  title: string;
  country: string;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
}

// Use async/await over promises
async function createAlbum(data: AlbumData): Promise<Album> {
  const album = await db.album.create({ data });
  return album;
}

// Handle errors gracefully
try {
  await createAlbum(albumData);
} catch (error) {
  logger.error("Failed to create album:", error);
  throw new Error("Album creation failed");
}
```

### Pull Request Process

1. Ensure tests pass: `pnpm test && pnpm test:e2e`
2. Run type check: `pnpm type-check`
3. Verify build: `pnpm build`
4. Update documentation if needed
5. Create pull request with clear description

## 📞 Support

### Development Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: `/docs` folder
- **Examples**: `/examples` folder

### Production Support

- **Monitoring**: Sentry dashboard
- **Logs**: Vercel function logs
- **Database**: Supabase dashboard
- **Performance**: Vercel analytics

---

**Last Updated**: $(date +%Y-%m-%d)  
**Version**: 2.0.0  
**Documentation**: Always kept up-to-date with code changes
