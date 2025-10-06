# Production Deployment Guide

## Security Checklist

### ✅ Completed Security Measures

1. **Security Headers**
   - ✅ Strict-Transport-Security (HSTS)
   - ✅ X-Frame-Options (clickjacking protection)
   - ✅ X-Content-Type-Options (MIME sniffing protection)
   - ✅ Content-Security-Policy (XSS protection)
   - ✅ Referrer-Policy
   - ✅ Permissions-Policy

2. **Input Validation & Sanitization**
   - ✅ DOMPurify for HTML sanitization
   - ✅ Zod schemas for all user inputs
   - ✅ File upload validation (type, size)
   - ✅ Rate limiting utilities

3. **Database Security**
   - ✅ Row Level Security (RLS) enabled on all tables
   - ✅ Secure RPC functions with `SECURITY DEFINER`
   - ✅ SQL injection prevention
   - ✅ No self-follows constraint
   - ✅ Valid enum constraints

4. **Performance Optimizations**
   - ✅ Database indexes on frequently queried columns
   - ✅ Image optimization (WebP, AVIF)
   - ✅ Code splitting (vendor, common, globe chunks)
   - ✅ Tree shaking enabled
   - ✅ SWC minification
   - ✅ Remove console logs in production

5. **Error Handling**
   - ✅ Global ErrorBoundary component
   - ✅ Structured logging with context
   - ✅ Environment variable validation

## Pre-Deployment Steps

### 1. Run Database Migrations

```bash
# Run all migrations in Supabase SQL Editor in order:
1. supabase/migrations/20241005_create_social_tables.sql
2. supabase/migrations/20241008_fix_social_tables_columns.sql
3. supabase/migrations/20241206_fix_dashboard_stats_function.sql
4. supabase/migrations/20241206_production_optimizations.sql
```

### 2. Environment Variables

Ensure all required environment variables are set in Vercel:

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Optional:**
```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=xxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Supabase Configuration

#### Enable RLS Policies
All tables should have RLS enabled (already done via migration).

#### Storage Bucket Configuration
```sql
-- Ensure storage bucket has proper policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true);

-- Storage policies
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view public photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Enable Email Confirmations
In Supabase Dashboard → Authentication → Settings:
- ✅ Enable email confirmations
- ✅ Set up SMTP provider (e.g., SendGrid, Mailgun)
- ✅ Configure email templates

### 4. Performance Optimizations

#### Vercel Configuration
- Enable Edge Runtime where possible
- Configure Analytics
- Set up Web Vitals monitoring

#### CDN Configuration
- Images are automatically optimized via Vercel
- Static assets cached for 1 year
- Service Worker caching enabled

### 5. Monitoring Setup

#### Error Tracking
Add Sentry or similar:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Analytics
- Vercel Analytics (already enabled)
- Google Analytics (optional)
- PostHog (optional for user behavior)

### 6. Backup Strategy

#### Database Backups
In Supabase Dashboard → Database → Backups:
- ✅ Enable daily automatic backups
- Set retention period to 30 days
- Test restore procedure monthly

#### Storage Backups
- Supabase automatically backs up storage
- Consider additional backup to S3/CloudFlare R2 for critical data

### 7. Security Hardening

#### API Rate Limiting
In Supabase Dashboard → API Settings:
- Set rate limits per IP
- Monitor for abuse patterns

#### Authentication Settings
- Require email verification
- Enable MFA (optional)
- Set password requirements:
  - Minimum 8 characters
  - Require uppercase, lowercase, number

## Deployment Checklist

- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Enable RLS policies
- [ ] Set up storage bucket policies
- [ ] Configure email provider
- [ ] Enable automatic backups
- [ ] Set up monitoring (Sentry/Analytics)
- [ ] Test error boundaries
- [ ] Verify security headers
- [ ] Test with Lighthouse (Performance, Accessibility, SEO)
- [ ] Run security audit: `npm audit`
- [ ] Test on multiple devices/browsers
- [ ] Set up custom domain with SSL
- [ ] Configure DNS (A/AAAA records)
- [ ] Test with real user data
- [ ] Document API endpoints
- [ ] Create runbook for common issues

## Post-Deployment Monitoring

### Key Metrics to Monitor

1. **Performance**
   - Core Web Vitals (LCP, FID, CLS)
   - Time to First Byte (TTFB)
   - Page load times
   - API response times

2. **Security**
   - Failed login attempts
   - Rate limit violations
   - SQL error rates (potential injection attempts)
   - File upload rejections

3. **Usage**
   - Active users (DAU/MAU)
   - Album creation rate
   - Photo upload volume
   - Storage usage trends

4. **Errors**
   - JavaScript errors (via Sentry)
   - API errors (4xx/5xx)
   - Database errors
   - Image optimization failures

### Daily Tasks
- Check error logs
- Monitor database performance
- Review security alerts
- Check storage usage

### Weekly Tasks
- Review analytics
- Check backup integrity
- Update dependencies
- Performance audit

### Monthly Tasks
- Security audit
- Database optimization
- Cost analysis
- Feature planning based on usage

## Rollback Procedure

If deployment fails:

1. **Immediate Rollback**
   ```bash
   vercel rollback
   ```

2. **Database Rollback**
   - Restore from last known good backup
   - Run down migrations if needed

3. **Communication**
   - Notify users via status page
   - Document incident
   - Post-mortem analysis

## Common Issues & Solutions

### Issue: High CPU on Supabase
**Solution:** Check slow queries, add missing indexes

### Issue: Storage limit reached
**Solution:**
- Clean up old/unused photos
- Implement image compression
- Archive old albums

### Issue: High API costs
**Solution:**
- Enable caching
- Reduce query frequency
- Optimize RPC functions

### Issue: Slow page loads
**Solution:**
- Check bundle size with `ANALYZE=true npm run build`
- Lazy load heavy components
- Reduce initial data fetching

## Support & Escalation

- Technical issues: Check Vercel logs
- Database issues: Check Supabase logs
- Security incidents: Follow incident response plan
- User reports: Check error tracking (Sentry)

---

## Production URLs

- **Production App:** https://adventure-log-azure.vercel.app
- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Analytics:** https://vercel.com/analytics

Last Updated: 2024-12-06
