# BookClub - Serverless Book Sharing Platform

A modern, serverless book club application where users can upload books they own and share them with others. Built with AWS Lambda, API Gateway, DynamoDB, S3, and Cognito for zero ongoing costs when not in use.

## Architecture

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions with Node.js
- **Database**: DynamoDB (pay-per-request)
- **Authentication**: AWS Cognito
- **File Storage**: S3 for book cover images
- **API**: AWS API Gateway

## Features

- User registration and authentication
- Add, edit, and delete books
- Upload book cover images
- View all books or filter by your own books
- Responsive design for mobile and desktop

# BookClub - Serverless Book Sharing Platform

A modern, serverless book club application where users can upload books they own and share them with others. Built with AWS Lambda, API Gateway, DynamoDB, S3, and Cognito for zero ongoing costs when not in use.

## Architecture

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions with Node.js
- **Database**: DynamoDB (pay-per-request)
- **Authentication**: AWS Cognito
- **File Storage**: S3 for book cover images
- **API**: AWS API Gateway

## Features

- User registration and authentication
- Add, edit, and delete books
- Upload book cover images
- View all books or filter by your own books
- Responsive design for mobile and desktop

## Development Environment Setup

### Quick Start

The fastest way to get started with development:

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd bookclub-app

# Run the automated setup script
./dev-setup.sh

# Start both backend and frontend
npm run dev
```

This will set up everything you need for local development!

### Manual Setup

If you prefer to set up manually or the script doesn't work:

#### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker & Docker Compose** (optional, for local DynamoDB)
- **AWS CLI** (optional, for DynamoDB table creation)

#### Step-by-Step Setup

1. **Install dependencies:**
   ```bash
   # Install backend dependencies
   cd bookclub-app/backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   
   # Install root development tools
   cd ../..
   npm install
   ```

2. **Set up environment files:**
   ```bash
   # Frontend environment
   cp bookclub-app/frontend/.env.example bookclub-app/frontend/.env.development
   
   # Backend environment (optional)
   cp bookclub-app/backend/.env.example bookclub-app/backend/.env
   ```

3. **Start local services (optional):**
   ```bash
   # Start local DynamoDB
   docker-compose up -d
   ```

4. **Seed test data:**
   ```bash
   cd bookclub-app/backend
   npm run seed
   ```

5. **Start development servers:**
   ```bash
   # Option 1: Start both services with one command
   npm run dev
   
   # Option 2: Start services separately
   # Terminal 1 - Backend
   cd bookclub-app/backend
   npm run dev
   
   # Terminal 2 - Frontend  
   cd bookclub-app/frontend
   npm start
   ```

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **DynamoDB Admin**: http://localhost:8001 (if using Docker)
- **Local DynamoDB**: http://localhost:8000 (if using Docker)

### Test Data

The development environment includes sample data:

**Test Users:**
- alice@example.com (password: password123)
- bob@example.com (password: password123)
- carol@example.com (password: password123)

**Sample Books:** Various books across different genres with different availability states.

### Development Features

- **Hot reload** for both frontend and backend
- **Mock authentication** for easy testing (no Cognito required locally)
- **File-based storage** as fallback when Docker isn't available
- **Sample data seeding** for immediate testing
- **Docker services** for production-like local database

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate permissions
- Serverless Framework CLI (`npm install -g serverless`)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd bookclub-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy to AWS:
   ```bash
   serverless deploy
   ```

4. Note the API URL from the deployment output.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd bookclub-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API URL:
   ```bash
   cp .env.example .env
   ```
   
4. Update the `.env` file with your actual API Gateway URL from the backend deployment.

5. Start the development server:
   ```bash
   npm start
   ```

## Local Development

### Running the Backend Locally

```bash
cd bookclub-app/backend
npm run dev
```

This will start the API at `http://localhost:4000` with hot reload.

### Development Scripts

#### Root Level Commands
```bash
npm run setup          # Run the development setup script
npm run dev            # Start both backend and frontend
npm run seed           # Populate with test data
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
```

#### Backend Commands
```bash
npm run dev            # Start backend with hot reload
npm run offline        # Start backend (alias for dev)
npm run seed           # Create test data
npm run dev:seed       # Seed data and start backend
```

#### Frontend Commands
```bash
npm start              # Start frontend development server
npm run build          # Build for production
npm test               # Run tests
```

### Data Storage

The development environment supports two modes:

1. **Docker Mode** (recommended): Uses local DynamoDB container
2. **File Mode** (fallback): Uses JSON files for data storage

The backend automatically detects which mode to use based on available services.

## Deployment

The application is designed to be completely serverless with zero ongoing costs:

- **DynamoDB**: Pay-per-request billing (free tier: 25 GB storage, 25 WCU, 25 RCU)
- **Lambda**: Pay-per-invocation (free tier: 1M requests/month)
- **API Gateway**: Pay-per-request (free tier: 1M requests/month)
- **S3**: Pay-per-storage and requests (free tier: 5 GB storage)
- **Cognito**: Free tier: 50,000 MAUs

## Security Features

- JWT-based authentication with AWS Cognito
- Protected API endpoints
- Secure file uploads with pre-signed URLs
- User-specific book ownership validation

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Books
- `GET /books` - List all books (with optional userId filter)
- `POST /books` - Create new book (authenticated)
- `GET /books/{bookId}` - Get specific book
- `PUT /books/{bookId}` - Update book (authenticated, owner only)
- `DELETE /books/{bookId}` - Delete book (authenticated, owner only)

### Files
- `POST /upload-url` - Generate pre-signed URL for image upload (authenticated)

### User
- `GET /users/me` - Get current user profile (authenticated)
