#!/bin/bash

# BookClub Development Environment Deployment Script
# This script deploys both backend and frontend to AWS for dev environment
set -e

echo "🚀 Deploying BookClub to DEVELOPMENT environment..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Deploy backend
echo "📦 Deploying backend (stage: dev)..."
cd backend
npm install
npx serverless deploy --stage dev

# Get the API URL from the deployment output
API_URL=$(npx serverless info --stage dev --verbose 2>/dev/null | grep "ServiceEndpoint:" | awk '{print $2}' || echo "")

if [ -z "$API_URL" ]; then
    echo "❌ Failed to get API URL from deployment"
    exit 1
fi

echo "✅ Backend deployed successfully!"
echo "📍 API URL: $API_URL"
echo ""

# Fetch Cognito outputs for frontend configuration
USER_POOL_ID=$(npx serverless info --stage dev --verbose 2>/dev/null | grep "UserPoolId:" | awk '{print $2}' || echo "")
USER_POOL_CLIENT_ID=$(npx serverless info --stage dev --verbose 2>/dev/null | grep "UserPoolClientId:" | awk '{print $2}' || echo "")
REGION=$(cat config/app.dev.json | grep '"region"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
DOMAIN_PREFIX=$(cat config/app.dev.json | grep 'userPoolDomainPrefix' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
COGNITO_DOMAIN="${DOMAIN_PREFIX}-dev.auth.${REGION}.amazoncognito.com"
REDIRECT_SIGNIN=$(cat config/app.dev.json | grep 'redirectSignIn' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
REDIRECT_SIGNOUT=$(cat config/app.dev.json | grep 'redirectSignOut' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
FRONTEND_BUCKET=$(cat config/app.dev.json | grep '"bucketName"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
FRONTEND_DOMAIN=$(cat config/app.dev.json | grep '"domain"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')

echo "📋 Cognito Config:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $USER_POOL_CLIENT_ID"
echo "   Domain: $COGNITO_DOMAIN"
echo "   Frontend Domain: $FRONTEND_DOMAIN"
echo "   S3 Bucket: $FRONTEND_BUCKET"
echo ""

# Build and deploy frontend
echo "🎨 Building frontend for dev environment..."
cd ../frontend

# Create .env.production file with dev settings
cat > .env.production << EOF
REACT_APP_API_URL=$API_URL
REACT_APP_COGNITO_REGION=$REGION
REACT_APP_COGNITO_USER_POOL_ID=$USER_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_COGNITO_DOMAIN=$COGNITO_DOMAIN
REACT_APP_OAUTH_REDIRECT_SIGNIN=$REDIRECT_SIGNIN
REACT_APP_OAUTH_REDIRECT_SIGNOUT=$REDIRECT_SIGNOUT
REACT_APP_OAUTH_SCOPES="openid email profile"
REACT_APP_OAUTH_RESPONSE_TYPE=code
REACT_APP_ENV=dev
EOF

npm install
npm run build

echo "✅ Frontend built successfully!"
echo ""

# Check if S3 bucket exists, create if not
echo "📤 Checking S3 bucket for frontend..."
if ! aws s3api head-bucket --bucket "$FRONTEND_BUCKET" 2>/dev/null; then
    echo "   Creating S3 bucket: $FRONTEND_BUCKET"
    aws s3 mb "s3://$FRONTEND_BUCKET" --region "$REGION"
    
    # Enable static website hosting
    aws s3api put-bucket-website --bucket "$FRONTEND_BUCKET" --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }'
    
    # Set bucket policy for public read
    aws s3api put-bucket-policy --bucket "$FRONTEND_BUCKET" --policy "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
            {
                \"Sid\": \"PublicReadGetObject\",
                \"Effect\": \"Allow\",
                \"Principal\": \"*\",
                \"Action\": \"s3:GetObject\",
                \"Resource\": \"arn:aws:s3:::${FRONTEND_BUCKET}/*\"
            }
        ]
    }"
    
    # Enable CORS
    aws s3api put-bucket-cors --bucket "$FRONTEND_BUCKET" --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedOrigins": ["*"],
                "MaxAgeSeconds": 3000
            }
        ]
    }'
    
    echo "✅ S3 bucket created and configured"
fi

# Sync build files to S3
echo "📤 Deploying frontend to S3..."
aws s3 sync build/ "s3://$FRONTEND_BUCKET/" --delete

echo "✅ Frontend deployed to S3!"
echo ""

# Get CloudFront Distribution ID if exists
CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null && contains(Aliases.Items, '${FRONTEND_DOMAIN}')].Id | [0]" --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_ID" ] && [ "$CLOUDFRONT_ID" != "None" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*" > /dev/null
    echo "✅ CloudFront cache invalidated"
fi

echo ""
echo "🎉 DEVELOPMENT deployment completed!"
echo ""
echo "📋 Dev Environment URLs:"
echo "   Frontend: https://$FRONTEND_DOMAIN (or S3 website: http://$FRONTEND_BUCKET.s3-website-$REGION.amazonaws.com)"
echo "   API: $API_URL"
echo ""
echo "⚠️  Important Setup Steps:"
echo "1. Ensure DNS for $FRONTEND_DOMAIN points to your CloudFront distribution"
echo "2. In Cognito Console, add these callback URLs to your app client:"
echo "   - $REDIRECT_SIGNIN"
echo "3. In Google Cloud Console, add authorized redirect URI:"
echo "   - https://$COGNITO_DOMAIN/oauth2/idpresponse"
echo ""
echo "💡 To create a CloudFront distribution for HTTPS:"
echo "   Run: aws cloudfront create-distribution --origin-domain-name ${FRONTEND_BUCKET}.s3.amazonaws.com"
echo ""
