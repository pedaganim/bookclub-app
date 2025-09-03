#!/bin/bash

# BookClub Deployment Script
set -e

echo "🚀 Deploying BookClub Application..."

# Deploy backend
echo "📦 Deploying backend..."
cd backend
npm install
serverless deploy --stage prod

# Get the API URL from the deployment output
API_URL=$(serverless info --stage prod --verbose | grep "ServiceEndpoint:" | awk '{print $2}')

if [ -z "$API_URL" ]; then
    echo "❌ Failed to get API URL from deployment"
    exit 1
fi

echo "✅ Backend deployed successfully!"
echo "📍 API URL: $API_URL"

# Build and prepare frontend
echo "🎨 Building frontend..."
cd ../frontend

# Create .env file with the API URL
echo "REACT_APP_API_URL=$API_URL" > .env

npm install
npm run build

echo "✅ Frontend built successfully!"
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the frontend to a static hosting service (Netlify, Vercel, S3+CloudFront)"
echo "2. Update the S3 CORS configuration if needed"
echo "3. Test the application with real users"
echo ""
echo "💰 Cost optimization:"
echo "- All services use pay-per-request pricing"
echo "- Zero cost when not in use"
echo "- Free tier covers most small-scale usage"
