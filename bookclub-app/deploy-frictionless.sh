#!/bin/bash
set -e

ENV=$1

if [[ "$ENV" != "india" && "$ENV" != "australia" ]]; then
  echo "Usage: ./deploy-frictionless.sh [india|australia]"
  exit 1
fi

echo "🚀 Starting frictionless deployment for: $ENV"

# Load config to get variables
CONFIG_FILE="backend/config/app.$ENV.json"
REGION=$(cat $CONFIG_FILE | grep '"region"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
BRAND=$(cat $CONFIG_FILE | grep '"BRAND"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
DOMAIN=$(cat $CONFIG_FILE | grep '"apiCustomDomain"' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | sed 's/api.//' | tr -d ',')

# AWS Profile (Assuming profiles are named the same as the env)
export AWS_PROFILE="bookclub-$ENV"
echo "🔑 Using AWS Profile: $AWS_PROFILE"

# 1. Infrastructure (Terraform)
echo "🏗️  Deploying Infrastructure..."
cd backend/terraform
terraform init -reconfigure -backend-config="bucket=bookclub-$ENV-terraform-state" -backend-config="region=$REGION" -backend-config="key=terraform.tfstate"
terraform apply -var-file="$ENV.tfvars" -auto-approve
cd ../..

# 2. Backend (Serverless)
echo "📦 Deploying Backend..."
cd backend
npm install
export DEPLOY_TARGET=$ENV
serverless deploy --stage prod --region $REGION
cd ..

# 3. Frontend (React)
echo "🎨 Building Frontend for $BRAND ($DOMAIN)..."

# Fetch Cognito outputs from backend
cd backend
export DEPLOY_TARGET=$ENV
USER_POOL_ID=$(serverless info --stage prod --verbose | grep "UserPoolId:" | awk '{print $2}')
USER_POOL_CLIENT_ID=$(serverless info --stage prod --verbose | grep "UserPoolClientId:" | awk '{print $2}')
DOMAIN_PREFIX=$(cat config/app.$ENV.json | grep 'userPoolDomainPrefix' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
COGNITO_DOMAIN="${DOMAIN_PREFIX}.auth.${REGION}.amazoncognito.com"
REDIRECT_SIGNIN=$(cat config/app.$ENV.json | grep 'redirectSignIn' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
REDIRECT_SIGNOUT=$(cat config/app.$ENV.json | grep 'redirectSignOut' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
cd ..

cd frontend
cat > .env.$ENV << EOF
REACT_APP_BRAND_NAME=$BRAND
REACT_APP_API_URL=https://api.$DOMAIN
REACT_APP_COGNITO_REGION=$REGION
REACT_APP_COGNITO_USER_POOL_ID=$USER_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_COGNITO_DOMAIN=$COGNITO_DOMAIN
REACT_APP_OAUTH_REDIRECT_SIGNIN=$REDIRECT_SIGNIN
REACT_APP_OAUTH_REDIRECT_SIGNOUT=$REDIRECT_SIGNOUT
REACT_APP_DOMAIN=$DOMAIN
EOF

npm install
npm run build:$ENV
cd ..

# 4. Sync to S3
echo "📤 Uploading to S3..."
aws s3 sync frontend/build s3://$ENV-frontend-bucket --delete --profile $AWS_PROFILE

echo "✅ Deployment Complete for $BRAND!"
