# Backup & Recovery Strategy

## Overview

This document outlines the backup and recovery procedures for Adventure Log production database and storage.

## Backup Strategy

### Database Backups

**Provider:** Supabase (PostgreSQL)

**Backup Schedule:**
- **Daily backups:** Automatic at 2 AM UTC
- **Retention:** 7 days
- **Point-in-time recovery:** Available for Pro plan

**Manual Backup:**
```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Or via Supabase Dashboard
# Dashboard → Database → Backups → Create Backup
```

### Storage Backups

**Provider:** Supabase Storage

**Backup Method:**
- Photos stored in Supabase Storage buckets
- Automatic replication (if configured)
- Manual export via Supabase Dashboard

**Manual Export:**
```bash
# Export all photos (requires service role key)
# Use Supabase Storage API or Dashboard export feature
```

## Recovery Procedures

### Database Recovery

#### Full Database Restore

1. **Stop Application:**
   ```bash
   # Stop Vercel deployment or set maintenance mode
   ```

2. **Restore from Backup:**
   ```bash
   # Via Supabase Dashboard
   # Dashboard → Database → Backups → Restore
   
   # Or via CLI
   supabase db reset --db-url <backup-url>
   ```

3. **Verify Data:**
   ```bash
   # Check critical tables
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM albums;
   SELECT COUNT(*) FROM photos;
   ```

4. **Restart Application:**
   ```bash
   # Redeploy or disable maintenance mode
   ```

#### Point-in-Time Recovery

1. **Identify Recovery Point:**
   - Check Supabase Dashboard for available recovery points
   - Note timestamp before data loss

2. **Initiate Recovery:**
   - Dashboard → Database → Backups → Point-in-Time Recovery
   - Select recovery timestamp
   - Confirm recovery

3. **Verify and Restart:**
   - Verify data integrity
   - Restart application

### Storage Recovery

#### Photo Recovery

1. **Identify Missing Photos:**
   - Check Supabase Storage Dashboard
   - Review error logs

2. **Restore from Backup:**
   - If using backup bucket, restore files
   - Update database references if needed

3. **Verify:**
   - Check photo URLs in database
   - Verify files are accessible

## Disaster Recovery Plan

### Complete System Failure

**Scenario:** Complete database and storage loss

**Recovery Steps:**

1. **Assess Damage:**
   - Determine scope of data loss
   - Identify last known good backup

2. **Restore Database:**
   - Use most recent backup
   - Follow full database restore procedure

3. **Restore Storage:**
   - Restore from backup bucket
   - Verify file integrity

4. **Update Application:**
   - Clear caches
   - Restart services
   - Verify functionality

5. **Notify Users:**
   - Email users about incident
   - Provide status updates
   - Apologize for inconvenience

### Partial Data Loss

**Scenario:** Specific table or data corruption

**Recovery Steps:**

1. **Identify Affected Data:**
   - Query database for inconsistencies
   - Check error logs

2. **Restore Affected Tables:**
   - Export affected data from backup
   - Restore to production

3. **Verify Integrity:**
   - Run data validation queries
   - Check foreign key constraints

## Backup Testing

### Monthly Backup Verification

**Schedule:** First Monday of each month

**Procedure:**

1. **Test Restore:**
   - Restore latest backup to staging
   - Verify data integrity
   - Test application functionality

2. **Document Results:**
   - Record restore time
   - Note any issues
   - Update procedures if needed

### Quarterly Disaster Recovery Drill

**Schedule:** Every 3 months

**Procedure:**

1. **Simulate Disaster:**
   - Create test backup
   - Simulate data loss scenario

2. **Execute Recovery:**
   - Follow disaster recovery plan
   - Time recovery process
   - Document issues

3. **Review and Improve:**
   - Review recovery time
   - Identify improvements
   - Update procedures

## Backup Retention Policy

### Database Backups

- **Daily backups:** 7 days
- **Weekly backups:** 4 weeks (if configured)
- **Monthly backups:** 12 months (if configured)

### Storage Backups

- **Photo backups:** 30 days
- **Deleted photos:** 90 days (soft delete)

## Monitoring

### Backup Status Monitoring

**Checks:**
- Daily backup completion
- Backup size verification
- Backup integrity checks

**Alerts:**
- Backup failure → Immediate email
- Backup size anomaly → Email notification
- Integrity check failure → Immediate alert

### Recovery Time Objectives (RTO)

- **Critical data:** 1 hour
- **Non-critical data:** 4 hours
- **Full system:** 24 hours

### Recovery Point Objectives (RPO)

- **Maximum data loss:** 24 hours
- **Target data loss:** < 1 hour

## Best Practices

1. **Regular Testing:**
   - Test backups monthly
   - Verify restore procedures
   - Document recovery times

2. **Multiple Backups:**
   - Keep multiple backup copies
   - Store backups in different locations
   - Test backup restoration regularly

3. **Documentation:**
   - Keep recovery procedures updated
   - Document all recovery attempts
   - Review and improve procedures

4. **Automation:**
   - Automate backup processes
   - Set up monitoring alerts
   - Regular backup verification

## Contact

**Backup Issues:**
- Email: devops@adventurelog.app
- Response time: Within 1 hour

**Recovery Assistance:**
- On-call: Available 24/7 for critical issues
- Escalation: Contact Supabase support for database issues
