Centralized Backend Configuration

All backend configuration is centralized in `backend/config/app.json` and referenced by `serverless.yml` and `src/lib/aws-config.js`.

File: `backend/config/app.json`
{
  "region": "us-east-1",
  "apiCustomDomain": "api.bookclub.example.com",
  "userPoolDomainPrefix": "bookclub-app-dev",
  "local": {
    "dynamodbEndpoint": "http://localhost:8000",
    "awsAccessKeyId": "local",
    "awsSecretAccessKey": "local"
  }
}

Fields:
- region: AWS region for the stack and SDK clients.
- apiCustomDomain: API Gateway custom domain (used by serverless-domain-manager or similar plugin).
- userPoolDomainPrefix: The base domain prefix for the Cognito User Pool Hosted UI. Serverless appends `-<stage>`.
- local.dynamodbEndpoint: Endpoint for local DynamoDB when running offline.
- local.awsAccessKeyId / local.awsSecretAccessKey: Dummy credentials used by the AWS SDK in offline/dev mode.

Where it's used:
- `serverless.yml`:
  - provider.region = appConfig.region
  - custom.customDomain.domainName = appConfig.apiCustomDomain
  - resources.UserPoolDomain.Properties.Domain = `${appConfig.userPoolDomainPrefix}-${stage}`
- `src/lib/aws-config.js`:
  - Loads `region` and `local` settings for offline/dev environments.

Notes:
- Do not add secrets to this JSON for production. Use AWS SSM Parameter Store / Secrets Manager for sensitive values.
- You can create stage-specific files like `app.dev.json`, `app.prod.json` and point `serverless.yml` to the right one if you want per-stage configs.
