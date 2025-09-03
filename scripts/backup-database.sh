#!/bin/bash

# Adventure Log Database Backup Script
# Supports local development and production environments
# Usage: ./backup-database.sh [--type daily|weekly|monthly] [--verify]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Default values
BACKUP_TYPE="daily"
VERIFY_BACKUP=false
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --type)
      BACKUP_TYPE="$2"
      shift 2
      ;;
    --verify)
      VERIFY_BACKUP=true
      shift
      ;;
    --retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--type daily|weekly|monthly] [--verify] [--retention DAYS]"
      echo "  --type      Backup type (default: daily)"
      echo "  --verify    Verify backup after creation"
      echo "  --retention Number of days to keep backups (default: 30)"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Logging function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  case $level in
    INFO)  echo -e "${GREEN}[INFO]${NC} $message" ;;
    WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
    ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
  esac
  
  # Also log to file
  mkdir -p "$BACKUP_DIR"
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if required tools are installed
check_dependencies() {
  local missing_deps=()
  
  if ! command -v pg_dump >/dev/null 2>&1; then
    missing_deps+=("pg_dump (PostgreSQL client tools)")
  fi
  
  if ! command -v gzip >/dev/null 2>&1; then
    missing_deps+=("gzip")
  fi
  
  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log ERROR "Missing required dependencies:"
    for dep in "${missing_deps[@]}"; do
      log ERROR "  - $dep"
    done
    exit 1
  fi
}

# Load environment variables
load_environment() {
  local env_file="${PROJECT_ROOT}/.env.local"
  
  if [[ -f "$env_file" ]]; then
    log INFO "Loading environment from $env_file"
    # shellcheck source=/dev/null
    source "$env_file"
  else
    log WARN "No .env.local file found, using system environment"
  fi
  
  # Check if DATABASE_URL is set
  if [[ -z "${DATABASE_URL:-}" ]]; then
    log ERROR "DATABASE_URL environment variable is not set"
    exit 1
  fi
}

# Generate backup filename
generate_backup_filename() {
  local timestamp
  local filename
  
  case $BACKUP_TYPE in
    daily)
      timestamp=$(date +%Y%m%d_%H%M%S)
      filename="adventure-log-daily-${timestamp}.dump"
      ;;
    weekly)
      timestamp=$(date +%Y%m%d)
      filename="adventure-log-weekly-${timestamp}.dump"
      ;;
    monthly)
      timestamp=$(date +%Y%m)
      filename="adventure-log-monthly-${timestamp}.dump"
      ;;
    *)
      log ERROR "Invalid backup type: $BACKUP_TYPE"
      exit 1
      ;;
  esac
  
  echo "$filename"
}

# Create database backup
create_backup() {
  local backup_filename="$1"
  local backup_path="${BACKUP_DIR}/${backup_filename}"
  
  log INFO "Starting $BACKUP_TYPE backup..."
  log INFO "Target file: $backup_path"
  
  # Create backup directory if it doesn't exist
  mkdir -p "$BACKUP_DIR"
  
  # Determine pg_dump options based on backup type
  local pg_dump_opts=(
    "--format=custom"
    "--compress=9"
    "--verbose"
    "--no-password"
  )
  
  if [[ "$BACKUP_TYPE" == "weekly" ]] || [[ "$BACKUP_TYPE" == "monthly" ]]; then
    pg_dump_opts+=("--clean" "--create")
  fi
  
  # Create the backup
  local start_time=$(date +%s)
  
  if pg_dump "$DATABASE_URL" "${pg_dump_opts[@]}" --file="$backup_path"; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local file_size=$(du -h "$backup_path" | cut -f1)
    
    log INFO "Backup completed successfully in ${duration}s"
    log INFO "Backup size: $file_size"
    return 0
  else
    log ERROR "Backup failed"
    return 1
  fi
}

# Verify backup integrity
verify_backup() {
  local backup_path="$1"
  
  log INFO "Verifying backup integrity..."
  
  # Check if backup file exists and is not empty
  if [[ ! -f "$backup_path" ]]; then
    log ERROR "Backup file does not exist: $backup_path"
    return 1
  fi
  
  if [[ ! -s "$backup_path" ]]; then
    log ERROR "Backup file is empty: $backup_path"
    return 1
  fi
  
  # Verify backup can be read by pg_restore
  if pg_restore --list "$backup_path" >/dev/null 2>&1; then
    log INFO "✅ Backup verification successful"
    return 0
  else
    log ERROR "❌ Backup verification failed - file may be corrupted"
    return 1
  fi
}

# Test restore to temporary database (more thorough verification)
test_restore() {
  local backup_path="$1"
  local test_db_name="adventure_log_test_restore_$$"
  
  log INFO "Performing test restore to verify backup..."
  
  # Create temporary test database
  if createdb "$test_db_name" 2>/dev/null; then
    log INFO "Created test database: $test_db_name"
  else
    log WARN "Could not create test database (may not have permissions)"
    return 0
  fi
  
  # Attempt restore
  local restore_success=true
  if ! pg_restore --dbname="$test_db_name" --verbose "$backup_path" >/dev/null 2>&1; then
    log ERROR "Test restore failed"
    restore_success=false
  fi
  
  # Check table counts as basic validation
  if $restore_success; then
    local table_count
    table_count=$(psql "$test_db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")
    log INFO "Restored database has $table_count tables"
  fi
  
  # Cleanup test database
  if dropdb "$test_db_name" 2>/dev/null; then
    log INFO "Cleaned up test database"
  fi
  
  if $restore_success; then
    log INFO "✅ Test restore successful"
    return 0
  else
    log ERROR "❌ Test restore failed"
    return 1
  fi
}

# Clean up old backups based on retention policy
cleanup_old_backups() {
  log INFO "Cleaning up backups older than $RETENTION_DAYS days..."
  
  local deleted_count=0
  
  # Find and delete old backup files
  while IFS= read -r -d '' file; do
    if rm "$file"; then
      log INFO "Deleted old backup: $(basename "$file")"
      ((deleted_count++))
    else
      log WARN "Failed to delete: $(basename "$file")"
    fi
  done < <(find "$BACKUP_DIR" -name "adventure-log-*.dump" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
  
  if [[ $deleted_count -eq 0 ]]; then
    log INFO "No old backups to clean up"
  else
    log INFO "Deleted $deleted_count old backup(s)"
  fi
}

# Send notification (placeholder for future implementation)
send_notification() {
  local status="$1"
  local message="$2"
  
  # Future: Send to Slack, email, or other notification systems
  log INFO "Notification: [$status] $message"
  
  # Example Slack webhook (uncomment and configure if needed)
  # if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  #   curl -X POST "$SLACK_WEBHOOK_URL" \
  #     -H 'Content-type: application/json' \
  #     --data "{\"text\":\"🗄️ Adventure Log Backup [$status]: $message\"}"
  # fi
}

# Main execution
main() {
  local backup_filename
  local backup_path
  local success=true
  
  log INFO "Adventure Log Database Backup - Type: $BACKUP_TYPE"
  log INFO "Starting backup process at $(date)"
  
  # Check dependencies
  check_dependencies
  
  # Load environment variables
  load_environment
  
  # Generate backup filename
  backup_filename=$(generate_backup_filename)
  backup_path="${BACKUP_DIR}/${backup_filename}"
  
  # Create backup
  if create_backup "$backup_filename"; then
    log INFO "Backup created successfully"
  else
    log ERROR "Backup creation failed"
    send_notification "FAILED" "Database backup failed"
    exit 1
  fi
  
  # Verify backup if requested
  if $VERIFY_BACKUP; then
    if verify_backup "$backup_path"; then
      log INFO "Backup verification passed"
    else
      log ERROR "Backup verification failed"
      success=false
    fi
    
    # Additional thorough test (only for weekly/monthly backups)
    if [[ "$BACKUP_TYPE" == "weekly" ]] || [[ "$BACKUP_TYPE" == "monthly" ]]; then
      if test_restore "$backup_path"; then
        log INFO "Test restore passed"
      else
        log ERROR "Test restore failed"
        success=false
      fi
    fi
  fi
  
  # Clean up old backups
  cleanup_old_backups
  
  # Final status
  if $success; then
    log INFO "✅ Backup process completed successfully"
    log INFO "Backup location: $backup_path"
    send_notification "SUCCESS" "Database backup completed: $(basename "$backup_path")"
  else
    log ERROR "❌ Backup process completed with errors"
    send_notification "WARNING" "Database backup completed with verification errors"
    exit 1
  fi
  
  log INFO "Backup process finished at $(date)"
}

# Run main function
main "$@"