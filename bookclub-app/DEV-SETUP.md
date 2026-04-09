# Development Environment Setup Guide

This guide helps you set up a complete development environment for **booklub.shop** on AWS, including both backend (Serverless) and frontend (S3 + CloudFront).

## Overview

The development environment uses:
- **Backend**: AWS Lambda, API Gateway, DynamoDB, Cognito (deployed via Serverless Framework)
- **Frontend**: S3 static website hosting + CloudFront CDN
- **Domain**: `dev.booklub.shop` (subdomain of production)

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 18+ installed
3. Serverless Framework CLI installed (`npm install -g serverless`)
4. Access to the AWS account with permissions to create:
   - Lambda functions, API Gateway, DynamoDB tables, Cognito User Pools
   - S3 buckets, CloudFront distributions
   - Route 53 records (optional, for custom domain)

## Quick Start

### Option 1: Automated Deployment (Recommended)

Run the development deployment script:

```bash
cd /Users/maddy/CascadeProjects/windsurf-project/bookclub-app
./deploy-dev.sh
```

This script will:
1. Deploy the backend to the `dev` stage
2. Build the frontend with dev environment variables
3. Create the S3 bucket if it doesn't exist
4. Deploy the frontend to S3
5. Invalidate CloudFront cache (if distribution exists)

### Option 2: GitHub Actions (CI/CD)

Push to the `develop` or `dev` branch:

```bash
git checkout -b develop
git push origin develop
```

The GitHub Action will automatically deploy both backend and frontend.

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Manual Setup Steps

### 1. Deploy Backend

```bash
cd backend
npm install
npx serverless deploy --stage dev
```

### 2. Get Backend Outputs

```bash
npx serverless info --stage dev --verbose
```

Note down:
- `ServiceEndpoint` (API URL)
- `UserPoolId`
- `UserPoolClientId`

### 3. Create S3 Bucket for Frontend

```bash
aws s3 mb s3://bookclub-app-dev-frontend --region us-east-1

# Enable static website hosting
aws s3api put-bucket-website --bucket bookclub-app-dev-frontend \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

# Set bucket policy for public read
aws s3api put-bucket-policy --bucket bookclub-app-dev-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bookclub-app-dev-frontend/*"
    }]
  }'
```

### 4. Build and Deploy Frontend

```bash
cd frontend

# Create .env.production with dev values
cat > .env.production << EOF
REACT_APP_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
REACT_APP_COGNITO_REGION=us-east-1
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_xxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxx
REACT_APP_COGNITO_DOMAIN=bookclub-app-dev-dev.auth.us-east-1.amazoncognito.com
REACT_APP_OAUTH_REDIRECT_SIGNIN=https://dev.booklub.shop/auth/callback
REACT_APP_OAUTH_REDIRECT_SIGNOUT=https://dev.booklub.shop/
REACT_APP_OAUTH_SCOPES=openid email profile
REACT_APP_OAUTH_RESPONSE_TYPE=code
EOF

npm install
npm run build

# Deploy to S3
aws s3 sync build/ s3://bookclub-app-dev-frontend/ --delete
```

### 5. Create CloudFront Distribution (Recommended for HTTPS)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name bookclub-app-dev-frontend.s3.amazonaws.com \
  --default-root-object index.html \
  --query 'Distribution.Id' --output text

# Note the Distribution ID and Domain Name
```

Or use the AWS Console to create a CloudFront distribution with:
- **Origin**: `bookclub-app-dev-frontend.s3.amazonaws.com`
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Default Root Object**: `index.html`
- **Error Pages**: 404 → `/index.html` (200 OK) - for React Router

### 6. Configure DNS (Route 53 or External DNS)

Create a CNAME record:
- **Name**: `dev.booklub.shop`
- **Value**: `<cloudfront-domain>.cloudfront.net`

Or use Route 53 Alias record pointing to the CloudFront distribution.

### 7. Configure Cognito Callback URLs

In AWS Console → Cognito → User Pools → App Integration:
- Add `https://dev.booklub.shop/auth/callback` to Callback URL(s)
- Add `https://dev.booklub.shop/` to Sign out URL(s)

### 8. Configure Google OAuth (if using Google sign-in)

In Google Cloud Console → APIs & Services → Credentials:
- Add authorized redirect URI: `https://bookclub-app-dev-dev.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Environment Isolation

The `dev` stage creates completely isolated resources:

| Resource | Production | Development |
|----------|------------|-------------|
| API Gateway | `api.booklub.shop` | Auto-generated URL |
| Cognito User Pool | `booklub` | `bookclub-app-dev-dev` |
| DynamoDB Tables | `bookclub-app-*-prod` | `bookclub-app-*-dev` |
| S3 Bucket | `bookclub-app-prod-frontend` | `bookclub-app-dev-frontend` |
| Frontend Domain | `booklub.shop` | `dev.booklub.shop` |

## Testing the Dev Environment

After deployment, verify:

1. **Backend Health Check**:
   ```bash
   curl https://<api-url>/health
   ```

2. **Frontend Loading**:
   Open `https://dev.booklub.shop` in browser

3. **Authentication Flow**:
   - Click Sign In → should redirect to Cognito
   - After login → should redirect back to `dev.booklub.shop/auth/callback`

4. **Subdomain Testing**:
   Test club subdomains by creating a club and accessing `https://<club-slug>.dev.booklub.shop`

## Troubleshooting

### 403 Forbidden on S3
Check bucket policy allows public read access.

### CloudFront Not Updating
Invalidate the cache: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`

### Cognito Redirect Mismatch
Verify callback URLs in Cognito App client settings match exactly (including trailing slashes).

### CORS Errors
Ensure API Gateway CORS settings allow `https://dev.booklub.shop` as an origin.

## Cost Considerations

The dev environment uses AWS Free Tier eligible services:
- Lambda: 1M free requests/month
- API Gateway: Not free tier, but low cost for dev usage
- DynamoDB: 25GB free storage + on-demand pricing
- S3: 5GB free storage
- CloudFront: 50GB free data transfer

Estimated monthly cost for dev environment: **$5-15 USD** (depending on usage).

## Cleaning Up

To remove all dev resources:

```bash
# Delete backend
cd backend
npx serverless remove --stage dev

# Delete frontend S3 bucket
aws s3 rb s3://bookclub-app-dev-frontend --force

# Delete CloudFront distribution (via AWS Console first, disable it)
```
