# Adventure Log - Deployment Instructions

Complete guide for deploying your Adventure Log application so friends can use it.

## 📋 Table of Contents

1. [Quick Start (Local Development)](#quick-start-local-development)
2. [Production Deployment Options](#production-deployment-options)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [External Services Setup](#external-services-setup)
6. [Deployment Steps](#deployment-steps)
7. [Inviting Friends](#inviting-friends)
8. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start (Local Development)

For testing with friends locally or on your network:

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Initialize database
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 2. Configure Environment Variables

Edit `.env.local` with the following **minimum required** variables:

```bash
# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"  # Change to your domain for production
NEXTAUTH_SECRET="your-super-secret-key-here"  # Generate a random string

# Google OAuth (Required for authentication)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Supabase (Required for photo uploads)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 3. Run the Application

```bash
# Development mode
npm run dev

# The app will be available at http://localhost:3000
```

---

## 🌐 Production Deployment Options

Choose the deployment option that best fits your needs:

### Option 1: Vercel (Recommended - Free Tier Available)

**Best for:** Easy deployment, automatic scaling, built for Next.js

1. **Prepare for Vercel:**

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login
   ```

2. **Deploy:**

   ```bash
   vercel
   ```

3. **Configure Environment Variables in Vercel Dashboard:**
   - Go to your project settings
   - Add all environment variables from your `.env.local`
   - Update `NEXTAUTH_URL` to your Vercel domain

### Option 2: Railway (Great PostgreSQL Support)

**Best for:** Full-stack applications, easy database management

1. **Connect GitHub Repository to Railway**
2. **Deploy with one click**
3. **Add Environment Variables in Railway Dashboard**
4. **Use Railway's PostgreSQL add-on** (recommended for production)

### Option 3: Self-Hosted (VPS/Server)

**Best for:** Full control, custom domains

1. **Server Requirements:**
   - Node.js 18+
   - PM2 for process management
   - Nginx for reverse proxy
   - SSL certificate

2. **Deployment Steps:**

   ```bash
   # Clone repository
   git clone [your-repo-url]
   cd adventure-log-clean

   # Install dependencies
   npm install

   # Build application
   npm run build

   # Start with PM2
   pm2 start ecosystem.config.js
   ```

---

## 🔧 Environment Configuration

### Required Environment Variables

| Variable                        | Description                | How to Get                             |
| ------------------------------- | -------------------------- | -------------------------------------- |
| `DATABASE_URL`                  | Database connection string | See [Database Setup](#database-setup)  |
| `NEXTAUTH_URL`                  | Your app's URL             | `http://localhost:3000` or your domain |
| `NEXTAUTH_SECRET`               | JWT encryption key         | Generate: `openssl rand -base64 32`    |
| `GOOGLE_CLIENT_ID`              | Google OAuth client ID     | [Google Console](#google-oauth-setup)  |
| `GOOGLE_CLIENT_SECRET`          | Google OAuth secret        | [Google Console](#google-oauth-setup)  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL       | [Supabase Dashboard](#supabase-setup)  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key     | [Supabase Dashboard](#supabase-setup)  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service key       | [Supabase Dashboard](#supabase-setup)  |

### Optional Environment Variables

| Variable                       | Description                  | Default |
| ------------------------------ | ---------------------------- | ------- |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS` | Google Analytics ID          | -       |
| `APPLE_CLIENT_ID`              | Apple OAuth (future feature) | -       |
| `APPLE_CLIENT_SECRET`          | Apple OAuth secret           | -       |

---

## 🗄️ Database Setup

### For Development (SQLite)

```bash
DATABASE_URL="file:./dev.db"
```

- Automatic setup with `npm run db:push`
- Data stored locally in `dev.db` file

### For Production (PostgreSQL Recommended)

#### Option 1: Railway PostgreSQL

1. Add PostgreSQL add-on in Railway
2. Use the provided `DATABASE_URL` connection string

#### Option 2: Supabase PostgreSQL

1. Create new project at [supabase.com](https://supabase.com)
2. Get connection string from Settings → Database
3. Use the "Connection pooling" URL for better performance

#### Option 3: Self-hosted PostgreSQL

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/adventurelog"
```

### Database Migration Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations (production)
npm run db:migrate

# Reset database (careful!)
npm run db:reset
```

---

## 🔑 External Services Setup

### Google OAuth Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing
3. **Enable Google+ API:**
   - APIs & Services → Library
   - Search "Google+ API" → Enable

4. **Create OAuth Credentials:**
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client IDs
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

5. **Copy Client ID and Secret to your environment variables**

### Supabase Setup

1. **Create account at [supabase.com](https://supabase.com)**
2. **Create new project**
3. **Get API Keys:**
   - Settings → API
   - Copy `URL`, `anon key`, and `service_role key`

4. **Create Storage Bucket:**
   - Storage → New bucket
   - Name: `adventure-photos`
   - Public: Yes (for photo access)

5. **Set up Storage Policies:**

   ```sql
   -- Allow authenticated users to upload photos
   CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT
   WITH CHECK (auth.role() = 'authenticated');

   -- Allow public read access to photos
   CREATE POLICY "Photos are publicly viewable" ON storage.objects FOR SELECT
   USING (bucket_id = 'adventure-photos');
   ```

---

## 🚀 Deployment Steps

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Google OAuth configured with correct redirect URLs
- [ ] Supabase storage bucket created
- [ ] Build runs successfully: `npm run build`
- [ ] Type checking passes: `npm run type-check`

### Step-by-Step Deployment

#### 1. Prepare Your Code

```bash
# Final checks
npm run type-check
npm run lint
npm run build

# Test locally first
npm run start
```

#### 2. Deploy to Your Chosen Platform

**For Vercel:**

```bash
vercel --prod
```

**For Railway:**

- Push to GitHub
- Deploy automatically triggers

**For Self-hosted:**

```bash
# Upload code to server
scp -r . user@your-server:/path/to/app

# SSH into server
ssh user@your-server

# Start application
cd /path/to/app
npm install
npm run build
pm2 start ecosystem.config.js --env production
```

#### 3. Verify Deployment

- [ ] App loads at your domain
- [ ] Google sign-in works
- [ ] Photo uploads work
- [ ] Database operations work
- [ ] Globe visualization renders

---

## 👥 Inviting Friends

### How Friends Can Join

1. **Share your app URL** (e.g., `https://yourdomain.com`)

2. **Friends sign up using Google:**
   - Click "Sign in with Google"
   - Grant permissions
   - Complete profile setup

3. **Social Features:**
   - Friends can follow each other
   - View public albums
   - Like and comment on posts
   - See travel statistics

### Privacy Controls

**Public Albums:** Visible to all users
**Friends Only:** Visible to followers only
**Private:** Only visible to the owner

### User Management

**Admin Features** (if you want to add them later):

- User moderation
- Content reporting
- Analytics dashboard

---

## 🔧 Troubleshooting

### Common Issues

#### "Sign-in Error with Google"

- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Verify redirect URLs in Google Console match your domain
- Ensure `NEXTAUTH_URL` is correct for your environment

#### "Photo Upload Fails"

- Check Supabase keys are correct
- Verify storage bucket exists and is public
- Check storage policies allow uploads

#### "Database Connection Error"

- Verify `DATABASE_URL` is correct
- Run `npm run db:push` to sync schema
- Check database server is running

#### "Globe Not Loading"

- Check browser console for errors
- Verify Three.js dependencies are installed
- Try refreshing the page

#### "Build Fails"

- Run `npm run type-check` to see TypeScript errors
- Check for missing environment variables
- Ensure all dependencies are installed

### Performance Optimization

#### For Better Performance:

```bash
# Enable image optimization
NEXT_PUBLIC_IMAGES_DOMAINS="your-domain.com,supabase.co"

# Use connection pooling for database
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
```

#### Monitoring:

- Set up error tracking (Sentry)
- Monitor performance (Vercel Analytics)
- Database monitoring (Railway/Supabase dashboards)

---

## 📱 Mobile Considerations

The app is responsive and works on mobile browsers. For a better mobile experience:

1. **Add to Home Screen:** Users can install as PWA
2. **Mobile-Optimized:** Touch-friendly interface
3. **Photo Upload:** Works with mobile camera

---

## 🔄 Updates and Maintenance

### Regular Maintenance

1. **Update Dependencies:**

   ```bash
   npm update
   npm audit fix
   ```

2. **Database Backups:**
   - Set up automated backups (especially for production)
   - Test restore procedures

3. **Monitor Usage:**
   - Check server resources
   - Monitor database size
   - Review error logs

### Adding New Features

1. **Development:**

   ```bash
   # Create feature branch
   git checkout -b feature/new-feature

   # Develop and test
   npm run dev

   # Deploy
   git push origin feature/new-feature
   ```

2. **Database Schema Changes:**

   ```bash
   # Create migration
   npm run db:migrate

   # Deploy schema changes
   npm run db:push
   ```

---

## 📞 Support

If you encounter issues:

1. **Check the logs** in your deployment platform
2. **Review environment variables** are set correctly
3. **Test locally first** to isolate the issue
4. **Check database connectivity**
5. **Verify external service configurations**

---

## 🎉 You're Ready!

Your Adventure Log is now ready for friends to use! Share the URL and start logging your adventures together.

**Key Features for Friends:**

- ✅ Create photo albums with location data
- ✅ Visualize travels on interactive 3D globe
- ✅ Social features (follow, like, comment)
- ✅ Privacy controls for content
- ✅ Responsive design for mobile and desktop
- ✅ Secure authentication with Google

Happy adventuring! 🌍✈️📸
