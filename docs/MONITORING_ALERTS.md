# Monitoring & Alerting Configuration

## Alert Channels

- **Email:** alerts@yourdomain.com
- **Slack:** #alerts-production
- **PagerDuty:** (optional for on-call)

## Alert Priorities

### P0 - Critical (Immediate Response Required)
- Complete site down (>5 min)
- Database unavailable
- Security incident detected
- Data loss event

### P1 - High (Response within 1 hour)
- API error rate >5%
- Performance degradation (p95 >3s)
- Health check failures
- Payment processing issues

### P2 - Medium (Response within 4 hours)
- Individual feature failures
- Rate limiting breaches
- Non-critical errors
- Storage approaching limits

### P3 - Low (Response within 24 hours)
- Minor performance issues
- Warning thresholds
- Scheduled maintenance reminders

## Alert Configuration

### Health Check Failures

**Monitor:** UptimeRobot
**Threshold:** 5 consecutive failures
**Window:** 25 minutes
**Action:** Email + SMS

### Error Rate

**Monitor:** Sentry
**Threshold:** >5% error rate over 15 minutes
**Action:** Email + Slack

### Response Time

**Monitor:** Vercel Analytics
**Threshold:** p95 > 3s for 15 minutes
**Action:** Email notification

### Database Connection

**Monitor:** Custom health check
**Threshold:** 3 consecutive failures
**Action:** Immediate alert

### Rate Limit Breaches

**Monitor:** Log monitoring (Better Stack)
**Threshold:** >100 rate limits per minute
**Action:** Investigate potential attack

## Setup Instructions

### Sentry Alerts

1. Go to Sentry Dashboard → Alerts
2. Create alert rule:
   - Condition: Error rate > 5%
   - Time window: 15 minutes
   - Actions: Email + Slack webhook

### UptimeRobot

1. Create monitor for health endpoint
2. Set interval: 5 minutes
3. Configure alerts:
   - Email: alerts@yourdomain.com
   - SMS: (optional)

### Vercel Analytics

1. Enable Analytics in Vercel Dashboard
2. Set up webhook for performance alerts
3. Configure thresholds in dashboard

## Escalation Procedures

1. **P0 Alerts:** Immediate page to on-call engineer
2. **P1 Alerts:** Notify team in Slack, escalate if no response in 30 min
3. **P2 Alerts:** Create ticket, notify during business hours
4. **P3 Alerts:** Log for weekly review

## Runbooks

See individual runbooks for:
- Database recovery
- Rate limit incidents
- Performance degradation
- Security incidents
