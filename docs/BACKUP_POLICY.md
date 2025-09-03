# Backup and Recovery Policy

## Overview

This document outlines the backup and recovery procedures for Adventure Log to ensure data integrity, availability, and business continuity. This policy covers database backups, file storage, and disaster recovery procedures.

## Backup Strategy

### Database Backups

Adventure Log uses PostgreSQL as its primary database. The backup strategy employs multiple tiers for comprehensive data protection:

#### 1. Automated Daily Backups

**Schedule**: Daily at 2:00 AM UTC  
**Retention**: 30 days  
**Method**: PostgreSQL logical backup using `pg_dump`

```bash
# Daily backup command
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump"
```

#### 2. Weekly Full Backups

**Schedule**: Every Sunday at 1:00 AM UTC  
**Retention**: 12 weeks (3 months)  
**Method**: Complete database dump with all objects

```bash
# Weekly backup command
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --verbose \
  --clean \
  --create \
  --file="weekly_backup_$(date +%Y%m%d).dump"
```

#### 3. Monthly Archive Backups

**Schedule**: First Sunday of each month at 12:00 AM UTC  
**Retention**: 12 months  
**Method**: Full database dump with long-term storage

#### 4. Point-in-Time Recovery (PITR)

For production environments, implement continuous archiving with Write-Ahead Logs (WAL):

```sql
-- Enable WAL archiving in PostgreSQL
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /path/to/archive/%f';
```

### File Storage Backups (Supabase)

#### User-Uploaded Photos

- **Primary Storage**: Supabase Storage with built-in redundancy
- **Backup Strategy**: Cross-region replication enabled
- **Retention**: Indefinite (user data)
- **Recovery**: Automatic failover with Supabase

#### Application Assets

- **Primary Storage**: Vercel/CDN
- **Backup Strategy**: Version controlled in Git repository
- **Recovery**: Redeploy from repository

## Backup Locations

### Primary Backup Storage

- **Location**: Cloud storage (AWS S3, Google Cloud Storage, or similar)
- **Encryption**: AES-256 encryption at rest
- **Access Control**: Limited to authorized personnel only

### Secondary Backup Storage

- **Location**: Different cloud provider or region
- **Purpose**: Disaster recovery
- **Sync Schedule**: Weekly

### Local Development Backups

- **Purpose**: Development and testing
- **Retention**: 7 days
- **Location**: Local development environments

## Recovery Procedures

### Database Recovery

#### 1. Complete Database Restore

```bash
# Stop the application
systemctl stop adventure-log

# Drop existing database (CAUTION: Only in recovery scenarios)
dropdb adventure_log_production

# Create new database
createdb adventure_log_production

# Restore from backup
pg_restore \
  --dbname=$DATABASE_URL \
  --verbose \
  --clean \
  --create \
  backup_file.dump

# Restart application
systemctl start adventure-log
```

#### 2. Point-in-Time Recovery

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore base backup
tar -xzf base_backup.tar.gz -C /var/lib/postgresql/data/

# Restore WAL files up to target time
# Create recovery.conf with target time

# Start PostgreSQL in recovery mode
systemctl start postgresql
```

#### 3. Partial Data Recovery

For recovering specific tables or data:

```sql
-- Create temporary table from backup
pg_restore -t specific_table backup_file.dump | psql $DATABASE_URL

-- Verify data integrity
SELECT COUNT(*) FROM specific_table;

-- Merge or replace data as needed
```

### File Storage Recovery

#### Supabase Storage Recovery

1. Contact Supabase support for data recovery
2. Restore from cross-region backup if available
3. Update application configuration if needed

#### Manual File Recovery

If manual intervention is required:

```bash
# Download backup files
gsutil -m cp -r gs://backup-bucket/photos/* ./restore/

# Upload to new storage
supabase storage cp ./restore/* supabase://bucket-name/
```

## Backup Monitoring

### Automated Monitoring

#### 1. Backup Success Verification

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE="$1"
DATABASE_URL="$2"

# Test restore to temporary database
createdb temp_test_restore
pg_restore --dbname="postgresql://user:pass@localhost/temp_test_restore" "$BACKUP_FILE"

# Verify table counts
ORIGINAL_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
RESTORE_COUNT=$(psql "postgresql://user:pass@localhost/temp_test_restore" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

if [ "$ORIGINAL_COUNT" -eq "$RESTORE_COUNT" ]; then
  echo "✅ Backup verification successful"
  exit 0
else
  echo "❌ Backup verification failed"
  exit 1
fi

# Cleanup
dropdb temp_test_restore
```

#### 2. Backup Alert System

```bash
# Send alert if backup fails
if ! /path/to/backup-script.sh; then
  curl -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-type: application/json' \
    --data '{"text":"🚨 Database backup failed for Adventure Log"}'
fi
```

### Manual Verification

#### Weekly Backup Testing

1. Download latest weekly backup
2. Restore to staging environment
3. Run application tests
4. Verify data integrity

#### Monthly Disaster Recovery Test

1. Simulate complete data loss
2. Restore from monthly archive
3. Test full application functionality
4. Document recovery time and issues

## Security Considerations

### Encryption

- **In Transit**: All backups encrypted during transfer using TLS
- **At Rest**: Backup files encrypted with AES-256
- **Key Management**: Encryption keys stored separately from backups

### Access Control

- **Principle of Least Privilege**: Only authorized personnel can access backups
- **Audit Logging**: All backup access logged and monitored
- **Multi-Factor Authentication**: Required for backup system access

### Data Sanitization

For development/testing backups:

```sql
-- Sanitize sensitive data for non-production use
UPDATE users SET
  email = CONCAT('user_', id, '@example.com'),
  name = CONCAT('User ', id),
  password = NULL;

-- Remove sensitive metadata
UPDATE album_photos SET
  metadata = jsonb_set(metadata, '{gps}', 'null');
```

## Compliance and Retention

### Data Retention Policy

- **User Data**: Retained according to user preferences and legal requirements
- **Backup Data**: Follows the retention schedule outlined above
- **Deleted Data**: Permanently removed from backups after 90 days

### Compliance Requirements

- **GDPR**: Right to erasure implemented in backup procedures
- **Data Residency**: Backups stored in compliant regions
- **Audit Trail**: All backup and recovery operations logged

## Emergency Procedures

### Critical Data Loss Event

#### Immediate Response (0-1 hour)

1. **Stop all write operations** to prevent further data corruption
2. **Assess the scope** of data loss
3. **Notify key stakeholders** (CTO, DevOps team)
4. **Begin recovery process** using most recent backup

#### Short-term Response (1-4 hours)

1. **Restore from backup** to temporary environment
2. **Verify data integrity** of restored data
3. **Test critical application functions**
4. **Prepare for production cutover**

#### Recovery Implementation (4-8 hours)

1. **Switch DNS** to maintenance page
2. **Restore production database**
3. **Update application configuration** if needed
4. **Perform smoke tests**
5. **Restore normal operations**

### Communication Plan

- **Internal**: Slack channel #incidents for team updates
- **External**: Status page updates for users
- **Stakeholders**: Email updates every 2 hours during incident

## Backup Automation Scripts

### Daily Backup Script

```bash
#!/bin/bash
# daily-backup.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/adventure-log"
DATABASE_URL="${DATABASE_URL}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="daily_backup_${DATE}.dump"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Starting daily backup at $(date)"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_DIR}/${BACKUP_FILE}"

# Verify backup
if pg_restore --list "${BACKUP_DIR}/${BACKUP_FILE}" >/dev/null 2>&1; then
  echo "✅ Backup created successfully: ${BACKUP_FILE}"
else
  echo "❌ Backup verification failed: ${BACKUP_FILE}"
  exit 1
fi

# Upload to cloud storage
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://adventure-log-backups/daily/"

# Clean up old backups
find "$BACKUP_DIR" -name "daily_backup_*.dump" -mtime +${RETENTION_DAYS} -delete

echo "Daily backup completed at $(date)"
```

### Recovery Test Script

```bash
#!/bin/bash
# test-restore.sh

set -euo pipefail

BACKUP_FILE="$1"
TEST_DB="adventure_log_test_restore"

echo "Testing restore of backup: $BACKUP_FILE"

# Create test database
createdb "$TEST_DB"

# Restore backup
pg_restore \
  --dbname="$TEST_DB" \
  --verbose \
  --clean \
  "$BACKUP_FILE"

# Run basic integrity checks
TABLES=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
USERS=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
ALBUMS=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM albums" 2>/dev/null || echo "0")

echo "Restore test results:"
echo "  Tables: $TABLES"
echo "  Users: $USERS"
echo "  Albums: $ALBUMS"

# Cleanup
dropdb "$TEST_DB"

echo "✅ Restore test completed successfully"
```

## Monitoring and Alerting

### GitHub Actions Workflow

```yaml
# .github/workflows/backup-monitoring.yml
name: Backup Monitoring

on:
  schedule:
    - cron: "0 6 * * *" # Check backups daily at 6 AM UTC
  workflow_dispatch:

jobs:
  verify-backups:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify latest backup exists
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Check if yesterday's backup exists
          YESTERDAY=$(date -d "yesterday" +%Y%m%d)
          aws s3 ls s3://adventure-log-backups/daily/ | grep $YESTERDAY

      - name: Send alert if backup missing
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          message: "⚠️ Adventure Log backup verification failed"
```

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

### Production Environment

- **RTO**: 4 hours maximum downtime
- **RPO**: 24 hours maximum data loss
- **Availability Target**: 99.9% uptime

### Staging Environment

- **RTO**: 8 hours
- **RPO**: 7 days
- **Availability Target**: 99% uptime

### Development Environment

- **RTO**: 1 week
- **RPO**: 1 month
- **Availability Target**: Best effort

## Regular Review and Updates

This backup policy should be reviewed and updated:

- **Quarterly**: Review and test procedures
- **Semi-annually**: Update retention policies and tools
- **Annually**: Complete policy review and update
- **After incidents**: Update based on lessons learned

## Contact Information

### Primary Contacts

- **DevOps Lead**: devops@adventurelog.app
- **Database Administrator**: dba@adventurelog.app
- **CTO**: cto@adventurelog.app

### Emergency Contacts

- **On-call Engineer**: +1-XXX-XXX-XXXX
- **Escalation Manager**: +1-XXX-XXX-XXXX

---

**Document Version**: 1.0  
**Last Updated**: $(date +%Y-%m-%d)  
**Next Review**: $(date -d "+3 months" +%Y-%m-%d)
