# 🌍 Adventure Log - Social Travel Journal

A modern, full-featured travel journal platform with interactive 3D globe visualization, social features, and Progressive Web App capabilities. Share your adventures, connect with friends, and visualize your travels on a beautiful interactive globe.

![Adventure Log](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-blue?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-green?logo=pwa&logoColor=white)

## ✨ Features

### 🗺️ Interactive 3D Globe

- **React Three Fiber** powered 3D globe visualization
- Plot your travel locations with customizable pins
- Performance-optimized for mobile and desktop
- Real-time travel statistics and metrics

### 📱 Progressive Web App

- Install as a native app on mobile and desktop
- Offline functionality with service workers
- Push notifications for social interactions
- Responsive design optimized for all devices

### 🏖️ Travel Management

- Create and manage travel albums with photos
- Add detailed trip information, dates, and locations
- Tag and categorize your adventures
- Rich photo upload with metadata extraction

### 👥 Social Features

- Connect and follow friends
- Share adventures publicly or with friends only
- Like and comment on travel posts
- Privacy controls for personal content

### 🎯 Gamification

- Earn badges for travel achievements
- Complete travel challenges
- Track countries visited and distance traveled
- Streak tracking and progress indicators

### 🔐 Security & Privacy

- NextAuth.js authentication with Google OAuth
- Granular privacy controls
- Secure API endpoints with validation
- Production-ready security headers

### 📁 Signed Upload URLs

Adventure Log uses a secure file upload system powered by Supabase signed URLs:

**Why Signed Upload URLs?**

- **Security**: Service role keys never exposed to clients
- **Performance**: Direct browser-to-storage uploads (no server proxy)
- **Scalability**: Reduces server bandwidth and processing
- **Reliability**: 2-hour signed URL validity with automatic expiry

**How It Works:**

1. **Request**: Client requests signed upload URL from `/api/storage/signed-upload`
2. **Validate**: Server authenticates user and validates album ownership
3. **Generate**: Server creates signed URL with secure path: `albums/{albumId}/{userId}/{timestamp}-{safeName}`
4. **Upload**: Client uploads directly to Supabase Storage using signed URL
5. **Display**: Photos accessible via public URLs for fast loading

**API Endpoints:**

- `POST /api/storage/signed-upload` - Generate signed upload URLs
- `GET /api/albums/{albumId}/photos` - List album photos with metadata
- `DELETE /api/storage/file` - Secure server-side photo deletion

**Benefits:**

- No Row Level Security (RLS) policies needed
- Automatic path validation and user scoping
- Comprehensive audit logging
- Graceful error handling and recovery

## 🚀 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **3D Graphics**: React Three Fiber, Three.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Supabase with signed upload URLs
- **State Management**: TanStack Query
- **UI Components**: Radix UI, Shadcn/ui
- **PWA**: Custom service worker with background sync

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/adventure-log.git
   cd adventure-log
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local` file:**

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/adventure_log"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"

   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   ```

5. **Set up the database**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🌐 Production Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel:**
   - Import your GitHub repository in Vercel
   - Configure environment variables in Vercel dashboard
   - Deploy automatically on push to main branch

2. **Database Setup:**
   - Use a PostgreSQL provider (Railway, Neon, Supabase)
   - Run migrations: `npx prisma migrate deploy`

3. **Required Assets:**
   Before deploying, create these missing image assets:
   - PWA icons (72x72 to 512x512px) in `/public/icons/`
   - Favicon files in `/public/`
   - PWA screenshots in `/public/screenshots/`

   See the README files in each directory for detailed specifications.

### Environment Variables for Production

```env
DATABASE_URL="your-production-db-url"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="secure-production-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## 📱 PWA Installation

Adventure Log can be installed as a native app:

1. **Mobile**: Tap "Add to Home Screen" when prompted
2. **Desktop**: Click the install button in your browser
3. **Chrome**: Look for the install icon in the address bar

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with sample data
```

### Project Structure

```
adventure-log/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── dashboard/      # User dashboard
│   ├── globe/          # Interactive globe
│   └── albums/         # Travel albums
├── components/         # React components
│   ├── ui/            # Base UI components
│   ├── features/      # Feature-specific components
│   └── providers/     # Context providers
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── types/             # TypeScript definitions
├── prisma/            # Database schema
└── public/            # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for 3D graphics
- [Prisma](https://prisma.io/) for database management
- [Radix UI](https://radix-ui.com/) for accessible components
- [Vercel](https://vercel.com/) for hosting platform

## 📞 Support

If you have any questions or run into issues:

1. Check the [documentation](./docs/)
2. Search [existing issues](https://github.com/yourusername/adventure-log/issues)
3. Create a [new issue](https://github.com/yourusername/adventure-log/issues/new)

---

**Happy Adventuring! 🌟**
