#!/bin/bash
set -e

ENV=$1
COMPONENT=$2

if [[ "$ENV" != "india" && "$ENV" != "australia" ]]; then
  echo "Usage: ./deploy-frictionless.sh [india|australia] [all|backend|frontend|infra|function:<name>]"
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

# If COMPONENT is not specified, analyze git diff to suggest what to do
if [ -z "$COMPONENT" ]; then
  echo "🔍 Analyzing changes since last commit/head..."
  CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || echo "")
  
  # If there are no local unstaged/staged changes, check against previous commit
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
  fi
  
  HAS_INFRA_CHANGES=false
  HAS_BACKEND_CHANGES=false
  HAS_FRONTEND_CHANGES=false
  CHANGED_FUNCTIONS=()
  
  for file in $CHANGED_FILES; do
    if [[ "$file" =~ ^backend/terraform/ ]]; then
      HAS_INFRA_CHANGES=true
    elif [[ "$file" =~ ^frontend/ ]]; then
      HAS_FRONTEND_CHANGES=true
    elif [[ "$file" =~ ^backend/ ]]; then
      HAS_BACKEND_CHANGES=true
      # Check if it is a specific handler file
      if [[ "$file" =~ ^backend/src/handlers/([^/]+)/([^/]+)\.js$ ]]; then
        DIR_NAME="${BASH_REMATCH[1]}"
        FILE_NAME="${BASH_REMATCH[2]}"
        
        # Heuristics to map files to serverless function names
        FUNC_NAME=""
        if [[ "$FILE_NAME" == "create" ]]; then
          if [[ "$DIR_NAME" == "books" ]]; then FUNC_NAME="createBook"
          elif [[ "$DIR_NAME" == "clubs" ]]; then FUNC_NAME="createClub"
          fi
        elif [[ "$FILE_NAME" == "browse" ]]; then
          if [[ "$DIR_NAME" == "clubs" ]]; then FUNC_NAME="browseClubs"
          fi
        else
          FUNC_NAME="$FILE_NAME"
        fi
        
        if [ ! -z "$FUNC_NAME" ]; then
          CHANGED_FUNCTIONS+=("$FUNC_NAME")
        fi
      fi
    fi
  done
  
  echo "📋 Git diff analysis:"
  echo "  - Infrastructure changes: $HAS_INFRA_CHANGES"
  echo "  - Backend changes: $HAS_BACKEND_CHANGES"
  echo "  - Frontend changes: $HAS_FRONTEND_CHANGES"
  if [ ${#CHANGED_FUNCTIONS[@]} -gt 0 ]; then
    echo "  - Changed functions detected: ${CHANGED_FUNCTIONS[*]}"
  fi
  echo ""
  
  if [ -t 0 ]; then
    echo "Choose deployment option:"
    echo "1) Deploy everything (all)"
    if [ "$HAS_INFRA_CHANGES" = true ]; then echo "2) Deploy Infrastructure only (infra)"; fi
    if [ "$HAS_BACKEND_CHANGES" = true ]; then echo "3) Deploy Backend only (backend)"; fi
    if [ ${#CHANGED_FUNCTIONS[@]} -gt 0 ]; then
      for f in "${CHANGED_FUNCTIONS[@]}"; do
        echo "   - Deploy function only: function:$f"
      done
    fi
    if [ "$HAS_FRONTEND_CHANGES" = true ]; then echo "4) Deploy Frontend only (frontend)"; fi
    echo "q) Quit"
    read -p "Enter choice (or type backend/frontend/infra/function:name): " CHOICE
    
    case $CHOICE in
      1) COMPONENT="all" ;;
      2) COMPONENT="infra" ;;
      3) COMPONENT="backend" ;;
      4) COMPONENT="frontend" ;;
      q|Q) exit 0 ;;
      *)
        if [ ! -z "$CHOICE" ]; then
          COMPONENT="$CHOICE"
        else
          COMPONENT="all"
        fi
        ;;
    esac
  else
    # Non-interactive mode defaults
    if [ "$HAS_INFRA_CHANGES" = false ] && [ "$HAS_BACKEND_CHANGES" = true ] && [ "$HAS_FRONTEND_CHANGES" = false ]; then
      if [ ${#CHANGED_FUNCTIONS[@]} -eq 1 ]; then
        COMPONENT="function:${CHANGED_FUNCTIONS[0]}"
      else
        COMPONENT="backend"
      fi
    elif [ "$HAS_INFRA_CHANGES" = false ] && [ "$HAS_BACKEND_CHANGES" = false ] && [ "$HAS_FRONTEND_CHANGES" = true ]; then
      COMPONENT="frontend"
    else
      COMPONENT="all"
    fi
    echo "🤖 Non-interactive mode. Defaulting to: $COMPONENT"
  fi
fi

# Parse action flags
RUN_INFRA=false
RUN_BACKEND=false
RUN_FRONTEND=false
SINGLE_FUNCTION=""

if [[ "$COMPONENT" == "all" ]]; then
  RUN_INFRA=true
  RUN_BACKEND=true
  RUN_FRONTEND=true
elif [[ "$COMPONENT" == "infra" ]]; then
  RUN_INFRA=true
elif [[ "$COMPONENT" == "backend" ]]; then
  RUN_BACKEND=true
elif [[ "$COMPONENT" == "frontend" ]]; then
  RUN_FRONTEND=true
elif [[ "$COMPONENT" =~ ^function:(.+) ]]; then
  SINGLE_FUNCTION="${BASH_REMATCH[1]}"
elif [[ "$COMPONENT" == "-f" && ! -z "$3" ]]; then
  SINGLE_FUNCTION="$3"
else
  echo "❌ Unknown component: $COMPONENT"
  echo "Valid components: all, backend, frontend, infra, function:<functionName>, -f <functionName>"
  exit 1
fi

# 1. Infrastructure (Terraform)
if [ "$RUN_INFRA" = true ]; then
  echo "🏗️  Deploying Infrastructure..."
  cd backend/terraform
  terraform init -reconfigure -backend-config="bucket=bookclub-$ENV-terraform-state" -backend-config="region=$REGION" -backend-config="key=terraform.tfstate"
  terraform apply -var-file="$ENV.tfvars" -auto-approve
  cd ../..
fi

# 2. Backend (Serverless)
if [ "$RUN_BACKEND" = true ]; then
  echo "📦 Deploying Backend (Full)..."
  cd backend
  npm install
  export DEPLOY_TARGET=$ENV
  serverless deploy --stage prod --region $REGION
  cd ..
elif [ ! -z "$SINGLE_FUNCTION" ]; then
  echo "⚡ Deploying Single Backend Function: $SINGLE_FUNCTION..."
  cd backend
  export DEPLOY_TARGET=$ENV
  serverless deploy function --function $SINGLE_FUNCTION --stage prod --region $REGION
  cd ..
fi

# 3. Frontend (React)
if [ "$RUN_FRONTEND" = true ]; then
  echo "🎨 Building Frontend for $BRAND ($DOMAIN)..."
  
  # Fetch Cognito outputs from backend
  cd backend
  export DEPLOY_TARGET=$ENV
  
  # Allow overriding Cognito configuration via env vars for cross-region setups
  USER_POOL_ID=${COGNITO_USER_POOL_ID:-$(serverless info --stage prod --verbose | grep "UserPoolId:" | awk '{print $2}')}
  USER_POOL_CLIENT_ID=${COGNITO_CLIENT_ID:-$(serverless info --stage prod --verbose | grep "UserPoolClientId:" | awk '{print $2}')}
  
  DOMAIN_PREFIX=$(cat config/app.$ENV.json | grep 'userPoolDomainPrefix' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
  COGNITO_DOMAIN_VAL=${COGNITO_DOMAIN:-"${DOMAIN_PREFIX}.auth.${REGION}.amazoncognito.com"}
  COGNITO_REGION_VAL=${COGNITO_REGION:-$REGION}
  
  REDIRECT_SIGNIN=$(cat config/app.$ENV.json | grep 'redirectSignIn' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
  REDIRECT_SIGNOUT=$(cat config/app.$ENV.json | grep 'redirectSignOut' | sed -E 's/.*:\s*"([^"]+)".*/\1/' | tr -d ',')
  cd ..
  
  cd frontend
  cat > .env.$ENV << EOF
REACT_APP_BRAND_NAME=$BRAND
REACT_APP_API_URL=https://api.$DOMAIN
REACT_APP_COGNITO_REGION=$COGNITO_REGION_VAL
REACT_APP_COGNITO_USER_POOL_ID=$USER_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_COGNITO_DOMAIN=$COGNITO_DOMAIN_VAL
REACT_APP_OAUTH_REDIRECT_SIGNIN=$REDIRECT_SIGNIN
REACT_APP_OAUTH_REDIRECT_SIGNOUT=$REDIRECT_SIGNOUT
REACT_APP_DOMAIN=$DOMAIN
EOF
  
  npm install
  npm run build:$ENV
  cd ..
  
  # 4. Sync to S3
  echo "📤 Uploading to S3..."
  FRONTEND_BUCKET=$(grep 'frontend_bucket_name' backend/terraform/$ENV.tfvars | sed -E 's/.*=\s*"([^"]+)".*/\1/')
  echo "🪣 Target S3 Bucket: $FRONTEND_BUCKET"
  aws s3 sync frontend/build s3://$FRONTEND_BUCKET --delete --profile $AWS_PROFILE

  # 5. Invalidate CloudFront Cache
  echo "🧹 Invalidating CloudFront cache for $DOMAIN..."
  DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $AWS_PROFILE --query "DistributionList.Items[?Aliases.Items[?contains(@, '$DOMAIN')]].Id" --output text 2>/dev/null || echo "")
  
  if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    # Fallback: query by S3 bucket origin name
    DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $AWS_PROFILE --query "DistributionList.Items[?Origins.Items[?contains(DomainName, '$FRONTEND_BUCKET')]].Id" --output text 2>/dev/null || echo "")
  fi

  if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    echo "⚡ Found CloudFront Distribution ID: $DISTRIBUTION_ID"
    aws cloudfront create-invalidation --profile $AWS_PROFILE --distribution-id $DISTRIBUTION_ID --paths "/*"
  else
    echo "⚠️  CloudFront Distribution ID not found for $DOMAIN or S3 origin. Please invalidate cache manually if needed."
  fi
fi

echo "✅ Deployment Complete for $BRAND ($ENV)!"
