#!/bin/bash

# Bookclub App Development Environment Setup Script
# This script sets up everything needed for local development

set -e

echo "🚀 Setting up Bookclub App Development Environment..."

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

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local all_good=true
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        if [ "$major_version" -ge 18 ]; then
            print_success "Node.js $node_version (✓)"
        else
            print_error "Node.js version $node_version is too old. Please install Node.js 18 or higher."
            all_good=false
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        all_good=false
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        print_success "npm $(npm --version) (✓)"
    else
        print_error "npm is not installed."
        all_good=false
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        print_success "Docker $(docker --version | cut -d' ' -f3 | sed 's/,//') (✓)"
    else
        print_warning "Docker is not installed. Local DynamoDB will not be available."
        print_warning "You can still run the app with mock data storage."
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        print_success "Docker Compose $(docker-compose --version | cut -d' ' -f3 | sed 's/,//') (✓)"
    elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose (via docker compose) (✓)"
    else
        print_warning "Docker Compose is not installed. Local DynamoDB will not be available."
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Please install missing prerequisites and run this script again."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd bookclub-app/backend
    npm install
    cd ../..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd bookclub-app/frontend
    npm install
    cd ../..
    
    print_success "Dependencies installed successfully!"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Frontend environment
    if [ ! -f "bookclub-app/frontend/.env.development" ]; then
        cp bookclub-app/frontend/.env.example bookclub-app/frontend/.env.development
        print_success "Created frontend .env.development file"
        print_warning "Please review and update bookclub-app/frontend/.env.development with your configuration"
    else
        print_warning "Frontend .env.development already exists, skipping..."
    fi
    
    # Backend environment (optional)
    if [ ! -f "bookclub-app/backend/.env" ]; then
        cp bookclub-app/backend/.env.example bookclub-app/backend/.env
        print_success "Created backend .env file"
        print_warning "Please review and update bookclub-app/backend/.env if needed"
    else
        print_warning "Backend .env already exists, skipping..."
    fi
}

# Start local services
start_services() {
    print_status "Starting local services..."
    
    if command -v docker >/dev/null 2>&1; then
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose up -d
        elif docker compose version >/dev/null 2>&1; then
            docker compose up -d
        else
            print_warning "Docker Compose not available, skipping DynamoDB setup"
            return
        fi
        
        print_success "Local DynamoDB started on port 8000"
        print_status "DynamoDB Admin UI available at http://localhost:8001"
        
        # Wait a moment for DynamoDB to start
        sleep 3
    else
        print_warning "Docker not available, using file-based storage for development"
    fi
}

# Create DynamoDB tables
create_tables() {
    print_status "Creating DynamoDB tables..."
    
    if command -v aws >/dev/null 2>&1; then
        # Check if DynamoDB is running
        if curl -s http://localhost:8000 >/dev/null 2>&1; then
            cd bookclub-app/backend
            
            # Create books table
            aws dynamodb create-table \
                --endpoint-url http://localhost:8000 \
                --table-name bookclub-app-books-dev \
                --attribute-definitions \
                    AttributeName=bookId,AttributeType=S \
                    AttributeName=userId,AttributeType=S \
                --key-schema \
                    AttributeName=bookId,KeyType=HASH \
                --global-secondary-indexes \
                    IndexName=UserIdIndex,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1} \
                --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
                >/dev/null 2>&1 || print_warning "Books table may already exist"
            
            # Create users table
            aws dynamodb create-table \
                --endpoint-url http://localhost:8000 \
                --table-name bookclub-app-users-dev \
                --attribute-definitions \
                    AttributeName=userId,AttributeType=S \
                    AttributeName=email,AttributeType=S \
                --key-schema \
                    AttributeName=userId,KeyType=HASH \
                --global-secondary-indexes \
                    IndexName=EmailIndex,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1} \
                --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
                >/dev/null 2>&1 || print_warning "Users table may already exist"
            
            cd ../..
            print_success "DynamoDB tables created"
        else
            print_warning "DynamoDB is not running, tables will be created when backend starts"
        fi
    else
        print_warning "AWS CLI not installed, using local file storage for development"
    fi
}

# Install Serverless Framework globally if not present
install_serverless() {
    if ! command -v serverless >/dev/null 2>&1; then
        print_status "Installing Serverless Framework..."
        npm install -g serverless
        print_success "Serverless Framework installed globally"
    else
        print_success "Serverless Framework already installed"
    fi
}

# Main setup function
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  Bookclub App Dev Setup                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    install_serverless
    install_dependencies
    setup_environment
    start_services
    create_tables
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     Setup Complete!                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    print_success "Development environment is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend:    cd bookclub-app/backend && npm run offline"
    echo "2. Start the frontend:   cd bookclub-app/frontend && npm start"
    echo "3. Open your browser:    http://localhost:3000"
    echo ""
    echo "Additional resources:"
    echo "• Backend API:           http://localhost:4000"
    echo "• DynamoDB Admin:        http://localhost:8001"
    echo "• Local DynamoDB:        http://localhost:8000"
    echo ""
    echo "For more information, see the README.md file."
}

# Run the main function
main "$@"