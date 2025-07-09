#!/bin/bash

# 🔄 Athro Federation - Production Rollback Script
# This script handles emergency rollback to previous stable version

set -e  # Exit on any error

echo "🔄 Starting Athro Federation Production Rollback..."

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
BACKUP_DIR="/opt/athro-backups"
DEPLOYMENT_DIR="/opt/athro-federation"
CURRENT_VERSION=""
TARGET_VERSION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version|-v)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --list|-l)
            list_available_versions
            exit 0
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
    echo "  -v, --version VERSION    Rollback to specific version (tag or commit)"
    echo "  -l, --list              List available versions for rollback"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --version v1.2.3     # Rollback to tagged version"
    echo "  $0 --version abc123      # Rollback to specific commit"
    echo "  $0 --list               # Show available versions"
}

# List available versions
list_available_versions() {
    print_status "Available versions for rollback:"
    echo ""
    
    # Show git tags (releases)
    echo "📋 Tagged Releases:"
    git tag --sort=-version:refname -l "v*" | head -10
    echo ""
    
    # Show recent commits
    echo "📋 Recent Commits:"
    git log --oneline -10 --format="%h - %s (%cr)"
    echo ""
    
    # Show backups
    if [ -d "$BACKUP_DIR" ]; then
        echo "📋 Available Backups:"
        ls -la "$BACKUP_DIR" | grep "athro-code" | tail -10
    fi
}

# Get current version
get_current_version() {
    if [ -f "$DEPLOYMENT_DIR/.current_version" ]; then
        CURRENT_VERSION=$(cat "$DEPLOYMENT_DIR/.current_version")
    else
        CURRENT_VERSION=$(git rev-parse --short HEAD)
    fi
    
    print_status "Current version: $CURRENT_VERSION"
}

# Validate target version
validate_target_version() {
    if [ -z "$TARGET_VERSION" ]; then
        print_error "Target version not specified!"
        echo ""
        list_available_versions
        echo ""
        read -p "Enter version to rollback to: " TARGET_VERSION
        
        if [ -z "$TARGET_VERSION" ]; then
            print_error "No version specified. Exiting."
            exit 1
        fi
    fi
    
    # Check if version exists
    if ! git rev-parse --verify "$TARGET_VERSION" >/dev/null 2>&1; then
        print_error "Version '$TARGET_VERSION' not found in git repository!"
        exit 1
    fi
    
    print_status "Target version: $TARGET_VERSION"
}

# Confirm rollback
confirm_rollback() {
    print_warning "⚠️  PRODUCTION ROLLBACK CONFIRMATION ⚠️"
    echo ""
    echo "Current version: $CURRENT_VERSION"
    echo "Target version:  $TARGET_VERSION"
    echo ""
    echo "This will:"
    echo "  1. Stop all production services"
    echo "  2. Backup current state"
    echo "  3. Rollback code to target version"
    echo "  4. Potentially rollback database"
    echo "  5. Restart services"
    echo ""
    
    read -p "Are you absolutely sure you want to proceed? (type 'ROLLBACK' to confirm): " confirmation
    
    if [ "$confirmation" != "ROLLBACK" ]; then
        print_error "Rollback cancelled"
        exit 1
    fi
}

# Create emergency backup
create_backup() {
    print_status "Creating emergency backup of current state..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="athro-emergency-backup-${BACKUP_TIMESTAMP}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup code
    print_status "Backing up current code..."
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}-code.tar.gz" -C "$DEPLOYMENT_DIR" .
    
    # Backup database
    print_status "Backing up database..."
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/${BACKUP_NAME}-database.sql.gz"
        print_success "Database backup created"
    else
        print_warning "pg_dump not available, skipping database backup"
    fi
    
    # Save current version
    echo "$CURRENT_VERSION" > "$BACKUP_DIR/${BACKUP_NAME}-version.txt"
    
    print_success "Emergency backup created: $BACKUP_NAME"
}

# Stop services
stop_services() {
    print_status "Stopping all production services..."
    
    # Stop PM2 processes
    pm2 stop ecosystem.config.js --env production || {
        print_warning "Some PM2 processes may not have stopped cleanly"
    }
    
    # Wait for graceful shutdown
    sleep 5
    
    print_success "Services stopped"
}

# Rollback code
rollback_code() {
    print_status "Rolling back code to version $TARGET_VERSION..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Stash any local changes
    git stash push -m "Pre-rollback stash $(date)"
    
    # Checkout target version
    git checkout "$TARGET_VERSION"
    
    # Update submodules if any
    git submodule update --init --recursive
    
    print_success "Code rolled back to $TARGET_VERSION"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies for rolled back version..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm ci
    
    print_success "Dependencies installed"
}

# Handle database rollback
handle_database_rollback() {
    print_warning "Database rollback consideration..."
    echo ""
    echo "Database rollback is complex and potentially destructive."
    echo "Current options:"
    echo "  1. Keep current database (safest, may cause compatibility issues)"
    echo "  2. Restore from backup (destructive, data loss possible)"
    echo "  3. Manual intervention required"
    echo ""
    
    read -p "Choose option (1/2/3): " db_option
    
    case $db_option in
        1)
            print_status "Keeping current database"
            ;;
        2)
            restore_database_backup
            ;;
        3)
            print_warning "Manual database intervention required"
            print_status "Pausing rollback for manual intervention..."
            echo "Database state needs manual review before proceeding."
            echo "Press Enter when database is ready..."
            read
            ;;
        *)
            print_warning "Invalid option, keeping current database"
            ;;
    esac
}

# Restore database backup
restore_database_backup() {
    print_warning "🚨 DESTRUCTIVE OPERATION: Database Restore 🚨"
    echo ""
    echo "This will completely replace the current database!"
    echo "All data since the backup will be PERMANENTLY LOST!"
    echo ""
    
    read -p "Type 'DESTROY_DATABASE' to confirm: " confirm_db
    
    if [ "$confirm_db" != "DESTROY_DATABASE" ]; then
        print_error "Database restore cancelled"
        return 1
    fi
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*database.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        print_error "No database backup found!"
        return 1
    fi
    
    print_status "Restoring database from: $LATEST_BACKUP"
    
    # Restore database
    gunzip -c "$LATEST_BACKUP" | psql $DATABASE_URL
    
    print_success "Database restored from backup"
}

# Build applications
build_applications() {
    print_status "Building applications for rollback version..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Set production environment
    export NODE_ENV=production
    export VITE_APP_ENV=production
    
    # Build all applications
    npm run build
    
    print_success "Applications built"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    # Wait for services to start
    sleep 15
    
    print_success "Services started"
}

# Health checks
perform_health_checks() {
    print_status "Performing health checks..."
    
    # Wait for full startup
    sleep 30
    
    local health_check_failed=false
    
    # Check workspace
    if curl -f -s "http://localhost:5200/health" > /dev/null; then
        print_success "Workspace health check passed"
    else
        print_error "Workspace health check failed!"
        health_check_failed=true
    fi
    
    # Check dashboard
    if curl -f -s "http://localhost:5211/health" > /dev/null; then
        print_success "Dashboard health check passed"
    else
        print_error "Dashboard health check failed!"
        health_check_failed=true
    fi
    
    # Check webhooks
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        print_success "Webhook server health check passed"
    else
        print_error "Webhook server health check failed!"
        health_check_failed=true
    fi
    
    if [ "$health_check_failed" = true ]; then
        print_error "Health checks failed! Check logs immediately:"
        pm2 logs --lines 20
        return 1
    fi
    
    print_success "All health checks passed"
}

# Generate rollback report
generate_rollback_report() {
    print_status "Generating rollback report..."
    
    REPORT_FILE="rollback-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Production Rollback Report

## Rollback Details
- **Date**: $(date)
- **From Version**: $CURRENT_VERSION
- **To Version**: $TARGET_VERSION
- **Reason**: Emergency rollback
- **Operator**: $(whoami)

## Actions Performed
- ✅ Emergency backup created
- ✅ Services stopped gracefully
- ✅ Code rolled back to $TARGET_VERSION
- ✅ Dependencies reinstalled
- ✅ Applications rebuilt
- ✅ Services restarted
- ✅ Health checks passed

## System Status
\`\`\`
$(pm2 list 2>/dev/null || echo "PM2 status unavailable")
\`\`\`

## Health Check Results
$(curl -s "http://localhost:3002/health/detailed" 2>/dev/null || echo "Health check data unavailable")

## Important Notes
- Emergency backup location: $BACKUP_DIR
- Database state: $([ "$db_option" = "2" ] && echo "Restored from backup" || echo "Unchanged")
- Monitoring required for next 24 hours

## Next Steps
1. Monitor system stability
2. Verify core functionality
3. Check error rates and performance
4. Plan proper fix for original issue
5. Prepare new deployment when ready

---
Generated by Athro Federation Rollback Script
EOF

    print_success "Rollback report generated: $REPORT_FILE"
}

# Update version tracking
update_version_tracking() {
    echo "$TARGET_VERSION" > "$DEPLOYMENT_DIR/.current_version"
    echo "Rollback $(date): $CURRENT_VERSION -> $TARGET_VERSION" >> "$DEPLOYMENT_DIR/.deployment_history"
}

# Main rollback process
main() {
    print_status "🔄 Starting production rollback process..."
    echo ""
    
    get_current_version
    validate_target_version
    confirm_rollback
    
    echo ""
    print_status "Beginning rollback operation..."
    
    create_backup
    stop_services
    rollback_code
    install_dependencies
    handle_database_rollback
    build_applications
    start_services
    perform_health_checks
    update_version_tracking
    generate_rollback_report
    
    print_success "🎉 Production rollback completed successfully!"
    echo ""
    print_status "System has been rolled back to version: $TARGET_VERSION"
    echo "Report generated: $REPORT_FILE"
    echo ""
    print_warning "⚠️  POST-ROLLBACK ACTIONS REQUIRED:"
    echo "  1. Monitor system stability for next 24 hours"
    echo "  2. Verify all critical functionality works"
    echo "  3. Check error rates and performance metrics"
    echo "  4. Investigate and fix the original issue"
    echo "  5. Plan proper deployment when ready"
}

# Run main function
main "$@" 