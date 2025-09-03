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

To run the backend locally:

```bash
cd backend
serverless offline start
```

This will start the API at `http://localhost:4000`.

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
