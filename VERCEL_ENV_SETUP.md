# Vercel Environment Variables Setup

## Required Environment Variables for Production Deployment

Based on the codebase analysis, here are all the environment variables that need to be configured in Vercel:

### 🔧 **Core Database & Auth**

```bash
# Database (Required)
DATABASE_URL="postgresql://your-postgres-connection-string"

# NextAuth Configuration (Required)
NEXTAUTH_URL="https://your-app-domain.vercel.app"
NEXTAUTH_SECRET="your-32-character-secret-key"

# Google OAuth (Required)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 🗄️ **Supabase Configuration (Required)**

```bash
# Public Supabase Settings
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_BUCKET="adventure-photos"

# Server-side Supabase
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 🖼️ **Cloudinary (Optional - if using Cloudinary)**

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### ⚙️ **Application Configuration**

```bash
# App Settings
NEXT_PUBLIC_APP_URL="https://your-app-domain.vercel.app"
NEXT_PUBLIC_APP_NAME="Adventure Log"
NEXT_PUBLIC_APP_DESCRIPTION="Track your adventures and share your travel stories"

# Feature Flags
NEXT_PUBLIC_DEBUG="false"
NEXT_PUBLIC_DEV_TOOLS="false"
NEXT_PUBLIC_MOBILE_FEATURES="true"
NEXT_PUBLIC_PWA_ENABLED="true"
NEXT_PUBLIC_THEME_COLOR="#3b82f6"

# Environment
NODE_ENV="production"
```

### 🔧 **Build Configuration**

```bash
# Prisma Configuration
PRISMA_CLI_QUERY_ENGINE_TYPE="binary"

# Vercel Build Settings
NEXT_PHASE="phase-production-build"
```

### 📊 **Optional Integrations**

```bash
# Redis (Optional - for rate limiting)
REDIS_URL="your-redis-connection-string"
UPSTASH_REDIS_REST_URL="your-upstash-rest-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Error Tracking (Optional)
SENTRY_DSN="your-sentry-dsn"

# Notifications (Optional)
SLACK_WEBHOOK_URL="your-slack-webhook-url"
```

## 🚀 **How to Add to Vercel**

### Method 1: Via Vercel Dashboard

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add each variable with appropriate environment (Production/Preview/Development)

### Method 2: Via Vercel CLI

```bash
# Set environment variables via CLI
vercel env add VARIABLE_NAME production
```

### Method 3: Bulk Import

Create a `.env.production` file (don't commit it) and use:

```bash
vercel env pull .env.production
```

## ⚠️ **Important Notes**

1. **Database URL**: Use your actual PostgreSQL connection string
2. **NEXTAUTH_URL**: Must match your Vercel deployment domain
3. **NEXTAUTH_SECRET**: Generate with: `openssl rand -base64 32`
4. **Supabase Keys**: Get from your Supabase project dashboard
5. **Google OAuth**: Configure redirect URLs in Google Console to include your Vercel domain

## 🔒 **Security Guidelines**

- Never commit environment files to git
- Use Preview/Development environments for testing
- Rotate secrets regularly
- Use least-privilege principles for service accounts

## 🧪 **Testing Environment Setup**

After adding variables, test with:

- `/api/debug` - Environment variable status
- `/api/health` - Overall system health
- `/test` - Comprehensive service diagnostics
