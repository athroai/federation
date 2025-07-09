#!/bin/bash

# 💾 Athro Federation - Database Backup Script
# Automated database backup with retention and cloud sync

set -e  # Exit on any error

echo "💾 Starting Athro Federation Database Backup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/opt/athro-backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
WEEKLY_RETENTION_WEEKS="${WEEKLY_RETENTION_WEEKS:-4}"
MONTHLY_RETENTION_MONTHS="${MONTHLY_RETENTION_MONTHS:-12}"

# Database configuration
DB_NAME="${DB_NAME:-athro_prod}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

# Cloud storage configuration
CLOUD_BACKUP_ENABLED="${CLOUD_BACKUP_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-athro-backups}"
S3_PREFIX="${S3_PREFIX:-database}"

# Notification configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_RECIPIENT="${EMAIL_RECIPIENT:-}"

# Parse command line arguments
BACKUP_TYPE="daily"
FORCE_BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --type|-t)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --force|-f)
            FORCE_BACKUP=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE         Backup type: daily, weekly, monthly (default: daily)"
    echo "  -f, --force            Force backup even if recent backup exists"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR             Backup directory (default: /opt/athro-backups/database)"
    echo "  DB_NAME                Database name (default: athro_prod)"
    echo "  RETENTION_DAYS         Daily backup retention (default: 7)"
    echo "  CLOUD_BACKUP_ENABLED   Enable cloud backup (default: false)"
    echo "  S3_BUCKET              S3 bucket for cloud backup"
    echo ""
    echo "Examples:"
    echo "  $0                     # Daily backup"
    echo "  $0 --type weekly       # Weekly backup"
    echo "  $0 --type monthly      # Monthly backup"
    echo "  $0 --force             # Force backup"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump >/dev/null 2>&1; then
        print_error "pg_dump not found! Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check database connectivity
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        print_error "Cannot connect to database at $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check disk space (require at least 1GB free)
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
        print_warning "Low disk space available: ${AVAILABLE_SPACE}KB"
        if [ "$FORCE_BACKUP" != true ]; then
            print_error "Insufficient disk space. Use --force to override."
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Check if recent backup exists
check_recent_backup() {
    if [ "$FORCE_BACKUP" = true ]; then
        return 0
    fi
    
    case $BACKUP_TYPE in
        daily)
            RECENT_THRESHOLD=1440  # 24 hours in minutes
            ;;
        weekly)
            RECENT_THRESHOLD=10080  # 7 days in minutes
            ;;
        monthly)
            RECENT_THRESHOLD=43200  # 30 days in minutes
            ;;
    esac
    
    # Find most recent backup of this type
    RECENT_BACKUP=$(find "$BACKUP_DIR" -name "athro-${BACKUP_TYPE}-*.sql.gz" -mmin -$RECENT_THRESHOLD | head -1)
    
    if [ -n "$RECENT_BACKUP" ]; then
        print_warning "Recent $BACKUP_TYPE backup found: $(basename "$RECENT_BACKUP")"
        print_status "Use --force to create backup anyway"
        return 1
    fi
    
    return 0
}

# Create database backup
create_backup() {
    BACKUP_FILE="$BACKUP_DIR/athro-${BACKUP_TYPE}-${DATE}.sql"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    
    print_status "Creating $BACKUP_TYPE database backup..."
    print_status "Backup file: $(basename "$COMPRESSED_FILE")"
    
    # Start time tracking
    START_TIME=$(date +%s)
    
    # Create backup with verbose output
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-password \
        --file="$BACKUP_FILE" 2>&1 | while IFS= read -r line; do
            echo "  $line"
        done
    
    # Compress backup
    print_status "Compressing backup..."
    gzip "$BACKUP_FILE"
    
    # Calculate backup duration and size
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    
    print_success "Backup completed in ${DURATION}s, size: $BACKUP_SIZE"
    
    # Verify backup integrity
    print_status "Verifying backup integrity..."
    if gunzip -t "$COMPRESSED_FILE" 2>/dev/null; then
        print_success "Backup integrity verified"
    else
        print_error "Backup integrity check failed!"
        return 1
    fi
    
    # Store backup metadata
    cat > "${COMPRESSED_FILE}.meta" << EOF
{
    "backup_type": "$BACKUP_TYPE",
    "database": "$DB_NAME",
    "timestamp": "$DATE",
    "size_bytes": $(stat -c%s "$COMPRESSED_FILE"),
    "size_human": "$BACKUP_SIZE",
    "duration_seconds": $DURATION,
    "compression": "gzip",
    "pg_dump_version": "$(pg_dump --version | head -1)",
    "hostname": "$(hostname)",
    "operator": "$(whoami)"
}
EOF
    
    echo "$COMPRESSED_FILE"
}

# Upload to cloud storage
upload_to_cloud() {
    local backup_file="$1"
    
    if [ "$CLOUD_BACKUP_ENABLED" != "true" ]; then
        return 0
    fi
    
    print_status "Uploading backup to cloud storage..."
    
    # Check if AWS CLI is available
    if ! command -v aws >/dev/null 2>&1; then
        print_warning "AWS CLI not found, skipping cloud upload"
        return 0
    fi
    
    # Upload backup file
    S3_KEY="$S3_PREFIX/$(basename "$backup_file")"
    
    if aws s3 cp "$backup_file" "s3://$S3_BUCKET/$S3_KEY" --storage-class STANDARD_IA; then
        print_success "Backup uploaded to s3://$S3_BUCKET/$S3_KEY"
        
        # Upload metadata
        aws s3 cp "${backup_file}.meta" "s3://$S3_BUCKET/${S3_KEY}.meta" --content-type "application/json"
        
        # Set lifecycle policy for automatic cleanup
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "$S3_KEY" \
            --tagging "TagSet=[{Key=BackupType,Value=$BACKUP_TYPE},{Key=Database,Value=$DB_NAME},{Key=AutoDelete,Value=true}]"
    else
        print_error "Failed to upload backup to cloud storage"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups..."
    
    case $BACKUP_TYPE in
        daily)
            RETENTION=$RETENTION_DAYS
            UNIT="days"
            ;;
        weekly)
            RETENTION=$WEEKLY_RETENTION_WEEKS
            UNIT="weeks"
            # Convert weeks to days for find command
            RETENTION=$((RETENTION * 7))
            UNIT="days"
            ;;
        monthly)
            RETENTION=$MONTHLY_RETENTION_MONTHS
            UNIT="months"
            # Convert months to days for find command (approximate)
            RETENTION=$((RETENTION * 30))
            UNIT="days"
            ;;
    esac
    
    print_status "Removing $BACKUP_TYPE backups older than $RETENTION $UNIT..."
    
    # Find and remove old backup files
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "athro-${BACKUP_TYPE}-*.sql.gz" -mtime "+$RETENTION" 2>/dev/null || true)
    
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while IFS= read -r old_backup; do
            if [ -f "$old_backup" ]; then
                print_status "Removing old backup: $(basename "$old_backup")"
                rm -f "$old_backup" "${old_backup}.meta"
            fi
        done
        
        REMOVED_COUNT=$(echo "$OLD_BACKUPS" | wc -l)
        print_success "Removed $REMOVED_COUNT old backup(s)"
    else
        print_status "No old backups to remove"
    fi
    
    # Clean up cloud storage
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ] && command -v aws >/dev/null 2>&1; then
        print_status "Cleaning up old cloud backups..."
        
        # List and delete old backups from S3
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | while read -r date time size filename; do
            if [[ "$filename" == athro-${BACKUP_TYPE}-*.sql.gz ]]; then
                file_date=$(echo "$filename" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
                if [ -n "$file_date" ]; then
                    file_timestamp=$(date -d "${file_date:0:8} ${file_date:9:2}:${file_date:11:2}:${file_date:13:2}" +%s 2>/dev/null || echo "0")
                    current_timestamp=$(date +%s)
                    age_days=$(( (current_timestamp - file_timestamp) / 86400 ))
                    
                    if [ "$age_days" -gt "$RETENTION" ]; then
                        print_status "Removing old cloud backup: $filename"
                        aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$filename"
                        aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/${filename}.meta" 2>/dev/null || true
                    fi
                fi
            fi
        done
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local backup_file="$2"
    local error_message="$3"
    
    local message=""
    local color=""
    
    if [ "$status" = "success" ]; then
        color="good"
        message="✅ Database backup completed successfully\n"
        message+="Type: $BACKUP_TYPE\n"
        message+="File: $(basename "$backup_file")\n"
        message+="Size: $(du -h "$backup_file" | cut -f1)\n"
        message+="Time: $(date)"
    else
        color="danger"
        message="❌ Database backup failed\n"
        message+="Type: $BACKUP_TYPE\n"
        message+="Error: $error_message\n"
        message+="Time: $(date)"
    fi
    
    # Send Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # Send email notification
    if [ -n "$EMAIL_RECIPIENT" ] && command -v mail >/dev/null 2>&1; then
        echo -e "$message" | mail -s "Athro Database Backup $status" "$EMAIL_RECIPIENT" || true
    fi
}

# Generate backup report
generate_report() {
    local backup_file="$1"
    
    REPORT_FILE="$BACKUP_DIR/backup-report-${BACKUP_TYPE}-${DATE}.md"
    
    cat > "$REPORT_FILE" << EOF
# Database Backup Report

## Backup Details
- **Type**: $BACKUP_TYPE
- **Date**: $(date)
- **Database**: $DB_NAME
- **File**: $(basename "$backup_file")
- **Size**: $(du -h "$backup_file" | cut -f1)
- **Location**: $backup_file

## Backup Metadata
$(cat "${backup_file}.meta" 2>/dev/null || echo "Metadata not available")

## System Information
- **Hostname**: $(hostname)
- **Operator**: $(whoami)
- **PostgreSQL Version**: $(psql --version | head -1)
- **Disk Usage**: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')

## Cloud Storage
- **Enabled**: $CLOUD_BACKUP_ENABLED
$([ "$CLOUD_BACKUP_ENABLED" = "true" ] && echo "- **S3 Location**: s3://$S3_BUCKET/$S3_PREFIX/$(basename "$backup_file")")

## Retention Policy
- **Daily**: $RETENTION_DAYS days
- **Weekly**: $WEEKLY_RETENTION_WEEKS weeks
- **Monthly**: $MONTHLY_RETENTION_MONTHS months

---
Generated by Athro Federation Database Backup Script
EOF

    print_success "Backup report generated: $REPORT_FILE"
}

# Main backup process
main() {
    print_status "💾 Starting $BACKUP_TYPE database backup process..."
    echo "Database: $DB_NAME"
    echo "Backup directory: $BACKUP_DIR"
    echo "Timestamp: $DATE"
    echo ""
    
    # Check if backup is needed
    if ! check_recent_backup; then
        print_status "Skipping backup (recent backup exists)"
        exit 0
    fi
    
    local backup_file=""
    local error_message=""
    
    # Perform backup steps
    if check_prerequisites; then
        if backup_file=$(create_backup); then
            upload_to_cloud "$backup_file"
            cleanup_old_backups
            generate_report "$backup_file"
            send_notification "success" "$backup_file"
            
            print_success "🎉 Database backup completed successfully!"
            echo "Backup file: $backup_file"
            echo "Size: $(du -h "$backup_file" | cut -f1)"
        else
            error_message="Backup creation failed"
            send_notification "failure" "" "$error_message"
            print_error "$error_message"
            exit 1
        fi
    else
        error_message="Prerequisites check failed"
        send_notification "failure" "" "$error_message"
        print_error "$error_message"
        exit 1
    fi
}

# Handle script interruption
cleanup_on_exit() {
    if [ $? -ne 0 ]; then
        print_error "Backup process interrupted!"
        # Clean up any partial backup files
        find "$BACKUP_DIR" -name "athro-${BACKUP_TYPE}-${DATE}*" -type f -delete 2>/dev/null || true
    fi
}

trap cleanup_on_exit EXIT

# Run main function
main "$@" 