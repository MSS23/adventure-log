# Pre-Launch Checklist

Complete this checklist 1 week before launch.

## Security Audit

- [ ] All security vulnerabilities fixed
- [ ] Security scan passed (`npm audit`, CodeQL)
- [ ] Penetration testing completed (optional but recommended)
- [ ] SSL/TLS certificates valid and auto-renewing
- [ ] Environment variables secured (not in repo)
- [ ] API keys rotated to production keys
- [ ] Rate limiting tested under load (1000 concurrent users)
- [ ] CORS policies reviewed and restrictive
- [ ] Content Security Policy (CSP) headers active
- [ ] Security headers verified (X-Frame-Options, etc.)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled

## Infrastructure

- [ ] Production database migrations applied
- [ ] Redis configured and tested
- [ ] Health checks responding correctly
- [ ] Monitoring/alerting active (Sentry, UptimeRobot)
- [ ] Error tracking integrated
- [ ] Backup system verified (test restore)
- [ ] CDN configured (Vercel Edge Network)
- [ ] Domain configured with proper DNS
- [ ] SSL certificate installed and valid
- [ ] Load balancer configured (if applicable)
- [ ] Auto-scaling rules set (if applicable)
- [ ] Database connection pooling configured
- [ ] Static assets served from CDN

## Performance

- [ ] Lighthouse score > 90 (Performance)
- [ ] Lighthouse score > 90 (Accessibility)
- [ ] Core Web Vitals pass:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Bundle size < 300KB (first load)
- [ ] Images optimized (WebP/AVIF)
- [ ] Code splitting effective
- [ ] Lazy loading implemented
- [ ] Service worker caching configured
- [ ] Database indexes optimized
- [ ] API response times < 500ms (p95)

## Testing

- [ ] Unit tests passing (40%+ coverage)
- [ ] API route tests passing
- [ ] E2E critical path tests passing
- [ ] Mobile app tested (iOS)
- [ ] Mobile app tested (Android)
- [ ] Cross-browser testing:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Load testing completed (1000 concurrent users)
- [ ] Stress testing completed
- [ ] Security testing completed
- [ ] Accessibility testing (WCAG 2.1 Level AA)

## Documentation

- [ ] LICENSE file added
- [ ] CODE_OF_CONDUCT.md added
- [ ] SECURITY.md added
- [ ] CHANGELOG.md created and up-to-date
- [ ] README.md updated with production URLs
- [ ] API documentation complete
- [ ] User guides published
- [ ] Deployment guides available
- [ ] Troubleshooting guides written
- [ ] Internal runbooks created

## Legal & Compliance

- [ ] Privacy policy reviewed by legal
- [ ] Terms of service finalized
- [ ] Cookie consent implemented (if EU traffic expected)
- [ ] GDPR compliance verified (if applicable)
- [ ] CCPA compliance verified (if California users)
- [ ] Data retention policy documented
- [ ] Data processing agreements signed
- [ ] Copyright notices added
- [ ] Trademark search completed

## Communication

- [ ] Announcement blog post prepared
- [ ] Social media posts scheduled
- [ ] Email to beta users prepared (if applicable)
- [ ] Press release prepared (optional)
- [ ] Support email configured
- [ ] Status page configured (if applicable)

## Team Preparation

- [ ] On-call schedule established
- [ ] Escalation procedures documented
- [ ] War room setup (Slack channel, etc.)
- [ ] Monitoring dashboards bookmarked
- [ ] Rollback procedures tested
- [ ] Team briefed on launch plan
