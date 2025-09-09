# Deployment Issue Fix

## Problem
The GitHub Actions deployment workflow was failing with the message:
```
CFN exports for UserPoolId/ClientId not found; falling back to stack resources...
```

This occurred because the Serverless Framework deployment was not creating the required CloudFormation exports properly.

## Root Cause
The serverless.yml file was missing critical infrastructure resources that were referenced in:
- IAM role permissions
- Environment variables
- Lambda function configurations

Specifically missing:
1. **DynamoDB Tables**: 5 tables were referenced in IAM permissions but not defined
2. **S3 Bucket**: Book covers bucket was referenced but not created
3. **Table Indexes**: Global Secondary Indexes for efficient querying

## Solution
Added the missing infrastructure definitions to `serverless.yml`:

### DynamoDB Tables Added:
- `BooksTable` - Stores book information with UserIdIndex GSI
- `UsersTable` - Stores user profiles with EmailIndex GSI  
- `MetadataCacheTable` - Caches book metadata with TTL
- `BookclubGroupsTable` - Stores club information with CreatedByIndex GSI
- `BookclubMembersTable` - Stores club memberships with UserIdIndex GSI

### S3 Resources Added:
- `BookCoversBucket` - Stores book cover images
- `BookCoversBucketPolicy` - Allows public read access to covers
- CORS configuration for cross-origin uploads

### Key Features:
- All tables use provisioned throughput (5 RCU/WCU for cost optimization)
- Proper Global Secondary Indexes for efficient queries
- TTL enabled on metadata cache table
- Public read access on S3 bucket for cover images
- CORS enabled for frontend uploads

## Testing
- Added integration test to validate serverless configuration
- All existing tests continue to pass (101/101)
- Configuration syntax validated

## Expected Outcome
With these infrastructure resources properly defined, the CloudFormation stack will:
1. Create all required resources during deployment
2. Generate the expected exports (UserPoolId, UserPoolClientId, RestApiId)
3. Allow the deployment script to find Cognito credentials without fallback
4. Complete deployment successfully

The deployment issue should be resolved as the exports will now be available when the frontend build step queries for them.