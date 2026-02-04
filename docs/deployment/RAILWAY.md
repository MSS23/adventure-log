# Railway Deployment Guide

## Overview

Railway is a modern platform for deploying applications with minimal configuration.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected

## Quick Start

### 1. Connect Repository

1. Go to Railway Dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your Adventure Log repository

### 2. Configure Environment Variables

In Railway Dashboard → Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NODE_ENV=production
```

### 3. Deploy

Railway will automatically:
- Detect Next.js project
- Install dependencies
- Build application
- Deploy to production

## Custom Configuration

### railway.json (Optional)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Custom Domain

1. Go to Settings → Domains
2. Add custom domain
3. Configure DNS:
   - Add CNAME record pointing to Railway domain
   - Wait for SSL certificate (automatic)

## Database

### Use Supabase (Recommended)

Continue using Supabase as external database.

### Railway PostgreSQL (Alternative)

1. Add PostgreSQL service in Railway
2. Get connection string from Variables
3. Update `DATABASE_URL` environment variable

## Redis

### Use Upstash (Recommended)

Continue using Upstash Redis.

### Railway Redis (Alternative)

1. Add Redis service in Railway
2. Get connection details from Variables
3. Update Redis configuration

## Monitoring

Railway provides:
- Built-in logs
- Metrics dashboard
- Deployment history
- Error tracking

## Scaling

### Manual Scaling

- Adjust resources in Settings → Resources
- CPU: 0.5 vCPU to 8 vCPU
- Memory: 512MB to 16GB

### Auto Scaling

Railway automatically scales based on traffic.

## Cost

**Free Tier:**
- $5 credit/month
- 500 hours runtime

**Paid Plans:**
- Pay-as-you-go pricing
- ~$0.000463 per GB-hour
- ~$0.000231 per vCPU-hour

## Troubleshooting

### Build Failures

1. Check build logs in Railway Dashboard
2. Verify environment variables
3. Check Node.js version compatibility

### Deployment Issues

1. Review deployment logs
2. Check application health endpoint
3. Verify database connectivity

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Support Email: team@railway.app
