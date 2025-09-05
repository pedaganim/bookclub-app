Centralized Frontend Configuration

Use the following environment variables in a local `.env.development` file (this file is gitignored) to configure the frontend. Values are read by `src/config.ts`.

Variables:
- REACT_APP_API_URL: Base API URL. Example: http://localhost:4000/dev
- REACT_APP_COGNITO_DOMAIN: Cognito Hosted UI domain prefix + domain (no protocol). Example: bookclub-app-prod.auth.us-east-1.amazoncognito.com
- REACT_APP_COGNITO_REGION: AWS region. Example: us-east-1
- REACT_APP_COGNITO_USER_POOL_ID: Cognito User Pool ID. Example: us-east-1_XXXXXXXXX
- REACT_APP_COGNITO_CLIENT_ID: Cognito App Client ID. Example: 123abc456def...
- REACT_APP_OAUTH_REDIRECT_SIGNIN: Hosted UI callback URL. Example: http://localhost:3000/auth/callback
- REACT_APP_OAUTH_REDIRECT_SIGNOUT: Hosted UI sign-out URL. Example: http://localhost:3000/
- REACT_APP_OAUTH_SCOPES: Space or comma separated list of scopes. Default: "openid email profile"
- REACT_APP_OAUTH_RESPONSE_TYPE: OAuth response type. Recommended: "code"

Local Example (.env.development):
REACT_APP_API_URL=http://localhost:4000/dev
REACT_APP_COGNITO_REGION=us-east-1
REACT_APP_OAUTH_REDIRECT_SIGNIN=http://localhost:3000/auth/callback
REACT_APP_OAUTH_REDIRECT_SIGNOUT=http://localhost:3000/
REACT_APP_OAUTH_SCOPES=openid email profile
REACT_APP_OAUTH_RESPONSE_TYPE=code

Note: Do not commit .env files. They are ignored by the repo-wide .gitignore.
