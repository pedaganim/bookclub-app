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
# Prefer custom domain if configured
CUSTOM_API_DOMAIN=$(cat config/app.prod.json | grep 'apiCustomDomain' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
if [ -n "$CUSTOM_API_DOMAIN" ] && [ "$CUSTOM_API_DOMAIN" != "" ] && [ "$CUSTOM_API_DOMAIN" != "null" ]; then
  API_URL="https://$CUSTOM_API_DOMAIN"
fi

if [ -z "$API_URL" ]; then
    echo "❌ Failed to get API URL from deployment"
    exit 1
fi

echo "✅ Backend deployed successfully!"
echo "📍 API URL: $API_URL"

# Fetch Cognito outputs for frontend configuration
USER_POOL_ID=$(serverless info --stage prod --verbose | grep "UserPoolId:" | awk '{print $2}')
USER_POOL_CLIENT_ID=$(serverless info --stage prod --verbose | grep "UserPoolClientId:" | awk '{print $2}')
REGION=$(cat config/app.prod.json | grep '"region"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
DOMAIN_PREFIX=$(cat config/app.prod.json | grep 'userPoolDomainPrefix' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
COGNITO_DOMAIN="${DOMAIN_PREFIX}-prod.auth.${REGION}.amazoncognito.com"
REDIRECT_SIGNIN=$(cat config/app.prod.json | grep 'redirectSignIn' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
REDIRECT_SIGNOUT=$(cat config/app.prod.json | grep 'redirectSignOut' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')

# Build and prepare frontend
echo "🎨 Building frontend..."
cd ../frontend

# Create .env.production file with production settings
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
EOF

npm install
npm run build

echo "✅ Frontend built successfully!"
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the frontend build to your static hosting (S3+CloudFront at booklub.shop)"
echo "2. Ensure DNS for api.booklub.shop points to the API Gateway custom domain created by Serverless"
echo "3. In Google Cloud Console, set authorized redirect URI to https://$COGNITO_DOMAIN/oauth2/idpresponse"
echo "4. Test the application end-to-end"
echo ""
echo "💰 Cost optimization:"
echo "- All services use pay-per-request pricing"
echo "- Zero cost when not in use"
echo "- Free tier covers most small-scale usage"
