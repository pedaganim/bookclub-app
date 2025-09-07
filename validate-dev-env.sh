#!/bin/bash

# Bookclub App Development Environment Validation Script
# This script validates that the development environment is working correctly

set -e

echo "🧪 Validating Bookclub App Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if backend is running
check_backend() {
    print_status "Checking backend API..."
    
    if curl -s http://localhost:4000/dev/books >/dev/null 2>&1; then
        print_success "Backend API is running on http://localhost:4000"
        
        # Test books endpoint
        local books_count=$(curl -s http://localhost:4000/dev/books | jq '.data.items | length' 2>/dev/null || echo "0")
        if [ "$books_count" -gt 0 ]; then
            print_success "Books API returning $books_count books"
        else
            print_error "Books API not returning data"
            return 1
        fi
        
        # Test authentication
        local auth_response=$(curl -s -X POST http://localhost:4000/dev/auth/login \
          -H "Content-Type: application/json" \
          -d '{"email": "alice@example.com", "password": "password123"}' \
          | jq '.success' 2>/dev/null || echo "false")
        
        if [ "$auth_response" = "true" ]; then
            print_success "Authentication working"
        else
            print_error "Authentication not working"
            return 1
        fi
    else
        print_error "Backend API not accessible at http://localhost:4000"
        echo "       Make sure to run: cd bookclub-app/backend && npm run dev"
        return 1
    fi
}

# Check if frontend is running
check_frontend() {
    print_status "Checking frontend..."
    
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend is running on http://localhost:3000"
    else
        print_error "Frontend not accessible at http://localhost:3000"
        echo "       Make sure to run: cd bookclub-app/frontend && npm start"
        return 1
    fi
}

# Check if Docker services are available
check_docker() {
    print_status "Checking Docker services..."
    
    if command -v docker >/dev/null 2>&1; then
        if curl -s http://localhost:8000 >/dev/null 2>&1; then
            print_success "Local DynamoDB running on http://localhost:8000"
        else
            print_error "Local DynamoDB not running"
            echo "       Run: docker-compose up -d"
        fi
        
        if curl -s http://localhost:8001 >/dev/null 2>&1; then
            print_success "DynamoDB Admin UI running on http://localhost:8001"
        else
            print_error "DynamoDB Admin UI not running"
        fi
    else
        print_status "Docker not available - using file storage (this is fine for development)"
    fi
}

# Check seed data
check_seed_data() {
    print_status "Checking seed data..."
    
    local storage_dir="bookclub-app/backend/.local-storage"
    if [ -f "$storage_dir/books.json" ] && [ -f "$storage_dir/users.json" ]; then
        local books_count=$(jq 'keys | length' "$storage_dir/books.json" 2>/dev/null || echo "0")
        local users_count=$(jq 'keys | length' "$storage_dir/users.json" 2>/dev/null || echo "0")
        print_success "Seed data found: $users_count users, $books_count books"
    else
        print_error "Seed data not found"
        echo "       Run: cd bookclub-app/backend && npm run seed"
        return 1
    fi
}

# Main validation
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Development Environment Validation             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    local all_passed=true
    
    check_seed_data || all_passed=false
    echo ""
    check_docker
    echo ""
    check_backend || all_passed=false
    echo ""
    check_frontend || all_passed=false
    echo ""
    
    if [ "$all_passed" = true ]; then
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                  🎉 All Tests Passed! 🎉                   ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Your development environment is ready!"
        echo ""
        echo "📱 Frontend: http://localhost:3000"
        echo "🔧 Backend:  http://localhost:4000"
        echo "📊 DB Admin: http://localhost:8001"
        echo ""
        echo "Test credentials:"
        echo "  📧 alice@example.com / password123"
        echo "  📧 bob@example.com / password123"
        echo "  📧 carol@example.com / password123"
    else
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                 ❌ Some Tests Failed ❌                    ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Please check the errors above and run ./dev-setup.sh to fix issues."
        exit 1
    fi
}

# Run validation
main "$@"