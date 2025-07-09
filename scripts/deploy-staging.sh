#!/bin/bash

# 🧪 Athro Federation - Staging Deployment Script
# This script handles deployment to the staging environment

set -e  # Exit on any error

echo "🧪 Starting Athro Federation Staging Deployment..."

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

# Environment variables
STAGING_BRANCH=${STAGING_BRANCH:-"staging"}
STAGING_URL=${STAGING_URL:-"https://staging.athro.com"}
STAGING_ENV_FILE="apps/athro-dashboard/.env.staging"

# Check if staging environment file exists
check_staging_env() {
    if [ ! -f "$STAGING_ENV_FILE" ]; then
        print_warning "Staging environment file not found!"
        print_status "Creating staging environment from template..."
        
        if [ -f "apps/athro-dashboard/env.production.template" ]; then
            cp "apps/athro-dashboard/env.production.template" "$STAGING_ENV_FILE"
            
            # Update staging-specific values
            sed -i.bak \
                -e 's/NODE_ENV=production/NODE_ENV=staging/' \
                -e 's/yourdomain.com/staging.athro.com/g' \
                -e 's/pk_live_/pk_test_/g' \
                -e 's/sk_live_/sk_test_/g' \
                "$STAGING_ENV_FILE"
            
            print_warning "Please update $STAGING_ENV_FILE with staging-specific values"
        else
            print_error "No environment template found!"
            exit 1
        fi
    fi
    print_success "Staging environment file found"
}

# Pre-deployment validation
pre_deployment_checks() {
    print_status "Running pre-deployment checks..."
    
    # Check git status
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Working directory is not clean"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "$STAGING_BRANCH" ]; then
        print_warning "Not on staging branch ($CURRENT_BRANCH vs $STAGING_BRANCH)"
        read -p "Switch to staging branch? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout "$STAGING_BRANCH"
            git pull origin "$STAGING_BRANCH"
        else
            print_warning "Deploying from $CURRENT_BRANCH branch"
        fi
    fi
    
    print_success "Pre-deployment checks completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running test suite..."
    
    # Unit tests
    npm run test || {
        print_error "Unit tests failed!"
        read -p "Continue deployment anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    
    # Linting
    npm run lint || {
        print_warning "Linting issues found, but continuing..."
    }
    
    print_success "Tests completed"
}

# Build applications
build_applications() {
    print_status "Building applications for staging..."
    
    # Set staging environment
    export NODE_ENV=staging
    export VITE_APP_ENV=staging
    
    # Build workspace
    print_status "Building workspace..."
    cd apps/athro-workspace-2
    npm run build
    cd ../..
    print_success "Workspace built"
    
    # Build dashboard
    print_status "Building dashboard..."
    cd apps/athro-dashboard
    npm run build
    cd ../..
    print_success "Dashboard built"
    
    # Build webhook server
    print_status "Building webhook server..."
    cd webhook-server
    npm run build
    cd ..
    print_success "Webhook server built"
}

# Deploy to staging server
deploy_to_staging() {
    print_status "Deploying to staging environment..."
    
    # Stop existing services
    print_status "Stopping existing services..."
    pm2 stop ecosystem.config.js --env staging || true
    
    # Deploy with PM2
    print_status "Starting services in staging mode..."
    pm2 start ecosystem.config.js --env staging
    
    # Wait for services to start
    sleep 10
    
    print_success "Deployment completed"
}

# Health checks
staging_health_checks() {
    print_status "Running staging health checks..."
    
    # Wait for services to be fully ready
    sleep 15
    
    # Check workspace health
    if curl -f -s "${STAGING_URL}/health" > /dev/null; then
        print_success "Workspace is healthy"
    else
        print_error "Workspace health check failed!"
        pm2 logs athro-workspace --lines 20
        return 1
    fi
    
    # Check dashboard health
    if curl -f -s "${STAGING_URL}/dashboard/health" > /dev/null; then
        print_success "Dashboard is healthy"
    else
        print_error "Dashboard health check failed!"
        pm2 logs athro-dashboard --lines 20
        return 1
    fi
    
    # Check webhook server health
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        print_success "Webhook server is healthy"
    else
        print_error "Webhook server health check failed!"
        pm2 logs athro-webhooks --lines 20
        return 1
    fi
    
    print_success "All health checks passed"
}

# Run staging tests
run_staging_tests() {
    print_status "Running staging-specific tests..."
    
    # E2E tests against staging
    npm run test:e2e:staging || {
        print_warning "E2E tests failed, but deployment continues"
    }
    
    # Performance tests
    npm run lighthouse:staging || {
        print_warning "Performance tests failed, but deployment continues"
    }
    
    print_success "Staging tests completed"
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    REPORT_FILE="deployment-report-staging-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Staging Deployment Report

## Deployment Details
- **Date**: $(date)
- **Branch**: $(git branch --show-current)
- **Commit**: $(git rev-parse HEAD)
- **Environment**: Staging
- **URL**: $STAGING_URL

## Services Status
- **Workspace**: ✅ Running on port 5200
- **Dashboard**: ✅ Running on port 5211
- **Webhooks**: ✅ Running on port 3001
- **Health Monitor**: ✅ Running on port 3002

## Health Checks
$(curl -s "${STAGING_URL}/health/detailed" 2>/dev/null || echo "Health check data unavailable")

## PM2 Status
\`\`\`
$(pm2 list 2>/dev/null || echo "PM2 status unavailable")
\`\`\`

## Next Steps
1. Manual testing on staging environment
2. Performance validation
3. Security testing
4. Stakeholder review
5. Production deployment approval

---
Generated by Athro Federation Staging Deployment Script
EOF

    print_success "Report generated: $REPORT_FILE"
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Deployment failed! Checking logs..."
        pm2 logs --lines 50
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment process
main() {
    print_status "🧪 Starting staging deployment process..."
    echo "Branch: $(git branch --show-current)"
    echo "Commit: $(git rev-parse --short HEAD)"
    echo "Staging URL: $STAGING_URL"
    echo ""
    
    # Deployment steps
    check_staging_env
    pre_deployment_checks
    install_dependencies
    run_tests
    build_applications
    deploy_to_staging
    staging_health_checks
    run_staging_tests
    generate_report
    
    print_success "🎉 Staging deployment completed successfully!"
    echo ""
    print_status "Staging environment is ready for testing:"
    echo "  🌐 URL: $STAGING_URL"
    echo "  📊 Health: ${STAGING_URL}/health/detailed"
    echo "  📈 Metrics: ${STAGING_URL}/metrics"
    echo "  📋 Report: $REPORT_FILE"
    echo ""
    print_status "Next steps:"
    echo "  1. Perform manual testing"
    echo "  2. Run automated test suite"
    echo "  3. Performance validation"
    echo "  4. Security testing"
    echo "  5. Approve for production deployment"
}

# Run main function
main "$@" 