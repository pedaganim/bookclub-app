// Centralized frontend configuration
// Values are sourced from environment variables and have sensible defaults for local dev

export const config = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000/dev',
  env: process.env.NODE_ENV || 'development',
  cognito: {
    domain: process.env.REACT_APP_COGNITO_DOMAIN || '',
    region: process.env.REACT_APP_COGNITO_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
    userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
    redirectSignIn: process.env.REACT_APP_OAUTH_REDIRECT_SIGNIN || 'http://localhost:3000/auth/callback',
    redirectSignOut: process.env.REACT_APP_OAUTH_REDIRECT_SIGNOUT || 'http://localhost:3000/',
    scopes: (process.env.REACT_APP_OAUTH_SCOPES || 'openid email profile').split(/[,\s]+/).filter(Boolean),
    responseType: process.env.REACT_APP_OAUTH_RESPONSE_TYPE || 'code',
  },
} as const;
