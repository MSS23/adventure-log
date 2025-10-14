# Development Guide

## Local Development Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jtdkbjvqujgpwcqjydma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token (optional)
```

### 2. Supabase URL Configuration

#### Site URL
Set to your production URL:
```
https://adventure-log-azure.vercel.app
```

#### Redirect URLs
Add **all** of these to allow both local and production:
```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
http://localhost:3004/auth/callback
http://localhost:5000/**
http://localhost:*/**
https://adventure-log-azure.vercel.app/**
https://adventure-log-azure.vercel.app/auth/callback
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 5. Database Setup

If you haven't already, run the database migrations:

1. Go to Supabase Dashboard → SQL Editor
2. Run the `FINAL_COMPLETE_SCHEMA.sql` file from `supabase/migrations/`
3. This will set up:
   - Notifications system
   - Messaging system
   - Album collaboration
   - User levels & achievements

## Branch Workflow

### Development Branch
- All new features and fixes go here
- Branch: `development`
- Vercel: Not auto-deployed (configured in vercel.json)

### Master Branch
- Production-ready code only
- Branch: `master`
- Vercel: Auto-deploys on push

### Workflow
```bash
# Start new feature
git checkout development
git pull origin development

# Make changes
git add .
git commit -m "feat: your feature description"
git push origin development

# When ready for production
git checkout master
git merge development
git push origin master
```

## Common Development Tasks

### Run Linting
```bash
npm run lint
```

### Type Check
```bash
npm run type-check
```

### Build for Production
```bash
npm run build
```

### Analyze Bundle Size
```bash
npm run analyze
```

## Testing Authentication Locally

1. Make sure Supabase redirect URLs include `http://localhost:3000/**`
2. Start dev server: `npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Sign in with your account
5. You should be redirected back to `http://localhost:3000`

## Troubleshooting

### Authentication Issues
- ✅ Check `.env.local` has correct Supabase credentials
- ✅ Verify redirect URLs in Supabase dashboard
- ✅ Clear browser cookies and try again
- ✅ Check browser console for error messages

### Location Features Not Working
- Enable location permissions in browser
- Check if running on HTTPS (required for geolocation)
- `localhost` is treated as secure context

### Build Errors
- Delete `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for ESLint errors: `npm run lint`

## Mobile Development (Capacitor)

### Build for Mobile
```bash
npm run mobile:build
```

### Open in Android Studio
```bash
npm run mobile:dev
```

### Open in Xcode
```bash
npm run mobile:dev:ios
```

## Deployment

### Deploy to Vercel
Push to `master` branch to trigger auto-deployment:
```bash
git checkout master
git merge development
git push origin master
```

### Manual Deployment
Use Vercel CLI:
```bash
vercel deploy --prod
```

## Database Migrations

New migrations go in `supabase/migrations/` directory.

To apply:
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file content
3. Run the SQL
4. Verify tables/columns were created

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vercel Docs](https://vercel.com/docs)
