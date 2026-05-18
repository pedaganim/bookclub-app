# Google OAuth Login Fix - Issue #85

## Problem
Users were experiencing a login failure when attempting to authenticate with Google. The OAuth authorization request was returning a `400 Bad Request` error with `error=invalid_request`.

**Error URL:**
```
https://booklub-prod.auth.us-east-1.amazoncognito.com/oauth2/authorize?client_id=4705h2kn7jfps4k2r9j2h8ch9n&response_type=code&scope=openid+email+profile&redirect_uri=https%3A%2F%2Fbooklub.shop%2Fauth%2Fcallback&state=pkcetest&code_challenge_method=S256&code_challenge=%3CYOUR_CHALLENGE%3E
```

**Error Response:**
```
https://booklub-prod.auth.us-east-1.amazoncognito.com/error?error=invalid_request&client_id=4705h2kn7jfps4k2r9j2h8ch9n
```

## Root Cause
The AWS Cognito User Pool Client was configured to only support `COGNITO` as an identity provider, but did not include `Google` in the `SupportedIdentityProviders` list. Additionally, no Google Identity Provider was configured in the Cognito User Pool.

## Solution
Added Google as a supported identity provider by:

1. **Adding Google Identity Provider Resource**: Created a new `GoogleIdentityProvider` resource in `serverless.yml` that configures Google OAuth integration.

2. **Updating User Pool Client**: Modified the `UserPoolClient` to include `Google` in the `SupportedIdentityProviders` list.

3. **Configuring Dependencies**: Added proper dependency chain so the `UserPoolClient` waits for the `GoogleIdentityProvider` to be created first.

## Changes Made

### serverless.yml
```yaml
UserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  DependsOn: GoogleIdentityProvider  # Added dependency
  Properties:
    # ... existing configuration ...
    SupportedIdentityProviders:
      - COGNITO
      - Google  # Added Google support

GoogleIdentityProvider:  # New resource
  Type: AWS::Cognito::UserPoolIdentityProvider
  Properties:
    UserPoolId: !Ref UserPool
    ProviderName: Google
    ProviderType: Google
    ProviderDetails:
      client_id: ${ssm:/bookclub/oauth/google_client_id}
      client_secret: ${ssm:/bookclub/oauth/google_client_secret}
      authorize_scopes: "openid email profile"
    AttributeMapping:
      email: email
      given_name: given_name
      family_name: family_name
      name: name
```

### Tests Added
- `__tests__/integration/oauth-config.test.js`: Validates the OAuth configuration
- `__tests__/integration/oauth-url-construction.test.js`: Tests OAuth URL generation

## Prerequisites
The Google OAuth credentials must be stored in AWS Systems Manager Parameter Store:
- `/bookclub/oauth/google_client_id`
- `/bookclub/oauth/google_client_secret`

These are already configured in the deployment pipeline (`deploy.yml`).

## Expected Flow After Fix
1. User clicks "Continue with Google" button
2. Frontend generates PKCE code_challenge and redirects to Cognito
3. Cognito presents Google as an authentication option
4. User authenticates with Google
5. Google redirects back to Cognito
6. Cognito redirects to frontend callback URL with authorization code
7. Frontend exchanges code for tokens using PKCE
8. User is successfully logged in

## Validation
All existing tests continue to pass (121/121), and new OAuth-specific tests validate the configuration.

To deploy this fix:
```bash
cd bookclub-app/backend
npx serverless deploy --stage prod
```

The Google OAuth credentials are automatically retrieved from SSM during deployment.