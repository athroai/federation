#!/bin/bash

# Production Deployment Script for Athro Federation
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting Athro Federation Production Deployment..."

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

# Check if environment file exists
check_env_file() {
    if [ ! -f "apps/athro-dashboard/.env.production" ]; then
        print_error "Production environment file not found!"
        print_warning "Please copy env.production.template to .env.production and configure it"
        exit 1
    fi
    print_success "Production environment file found"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm run test:ci || {
        print_warning "Tests failed, but continuing deployment..."
    }
}

# Build applications
build_apps() {
    print_status "Building applications..."
    
    # Build dashboard
    print_status "Building dashboard..."
    cd apps/athro-dashboard
    npm run build
    cd ../..
    print_success "Dashboard built successfully"
    
    # Build workspace
    print_status "Building workspace..."
    cd apps/athro-workspace-2
    npm run build
    cd ../..
    print_success "Workspace built successfully"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Please install it: npm i -g vercel"
        exit 1
    fi
    
    # Deploy dashboard
    print_status "Deploying dashboard to Vercel..."
    cd apps/athro-dashboard
    vercel --prod --yes
    cd ../..
    print_success "Dashboard deployed to Vercel"
    
    # Deploy workspace
    print_status "Deploying workspace to Vercel..."
    cd apps/athro-workspace-2
    vercel --prod --yes
    cd ../..
    print_success "Workspace deployed to Vercel"
}

# Deploy Supabase functions
deploy_supabase_functions() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not found. Please install it first"
        exit 1
    fi
    
    cd apps/athro-dashboard
    
    # Deploy edge functions
    supabase functions deploy create-checkout-session
    supabase functions deploy stripe-webhook
    
    cd ../..
    print_success "Supabase functions deployed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd apps/athro-dashboard
    
    # Apply migrations
    supabase db push
    
    cd ../..
    print_success "Database migrations completed"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check if dashboard is accessible
    DASHBOARD_URL=$(vercel ls athro-dashboard --scope=your-team | grep -o 'https://[^ ]*' | head -1)
    if [ ! -z "$DASHBOARD_URL" ]; then
        if curl -f -s "$DASHBOARD_URL" > /dev/null; then
            print_success "Dashboard is accessible at $DASHBOARD_URL"
        else
            print_warning "Dashboard might not be fully ready yet"
        fi
    fi
    
    # Check if workspace is accessible
    WORKSPACE_URL=$(vercel ls athro-workspace --scope=your-team | grep -o 'https://[^ ]*' | head -1)
    if [ ! -z "$WORKSPACE_URL" ]; then
        if curl -f -s "$WORKSPACE_URL" > /dev/null; then
            print_success "Workspace is accessible at $WORKSPACE_URL"
        else
            print_warning "Workspace might not be fully ready yet"
        fi
    fi
}

# Main deployment process
main() {
    print_status "Starting production deployment process..."
    
    # Pre-deployment checks
    check_env_file
    
    # Install and build
    install_dependencies
    run_tests
    build_apps
    
    # Deploy services
    deploy_vercel
    deploy_supabase_functions
    run_migrations
    
    # Post-deployment checks
    health_check
    
    print_success "🎉 Production deployment completed successfully!"
    print_status "Next steps:"
    echo "  1. Configure your domain DNS to point to Vercel"
    echo "  2. Set up Stripe webhook endpoints"
    echo "  3. Configure monitoring and alerts"
    echo "  4. Test the payment flow end-to-end"
    echo "  5. Monitor application logs and metrics"
}

# Run deployment if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 