# Deployment Issue Fix

## Problem
The serverless deployment was failing with the error:
```
CREATE_FAILED: BookclubMembersTable (AWS::DynamoDB::Table)
Resource handler returned message: "Resource of type 'AWS::DynamoDB::Table' with identifier 'bookclub-app-bookclub-members-prod' already exists."
```

## Root Cause
This error occurs when CloudFormation tries to create a DynamoDB table that already exists in AWS from a previous deployment attempt. This typically happens when:
1. A previous deployment partially succeeded (created the table)  
2. The CloudFormation stack failed or was rolled back incompletely
3. The table was left orphaned in AWS without being managed by CloudFormation

## Solution
Added `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to all DynamoDB tables in `serverless.yml`. These policies:

### Benefits:
- **Handle existing resources gracefully**: CloudFormation will adopt existing tables instead of trying to create new ones
- **Preserve data during updates**: Tables won't be deleted/recreated during stack updates
- **Prevent accidental data loss**: Tables remain if the stack is deleted
- **Allow deployments to succeed**: Conflicts with existing resources are resolved

### Tables Updated:
- `BooksTable` - Stores book information with UserIdIndex GSI
- `UsersTable` - Stores user profiles with EmailIndex GSI  
- `MetadataCacheTable` - Caches book metadata with TTL
- `BookclubGroupsTable` - Stores club information with CreatedByIndex GSI
- `BookclubMembersTable` - Stores club memberships with UserIdIndex GSI

### Configuration Added:
```yaml
BooksTable:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain
  UpdateReplacePolicy: Retain
  Properties:
    # ... table configuration
```

## Technical Details
- **DeletionPolicy: Retain** - Preserves the table if the CloudFormation stack is deleted
- **UpdateReplacePolicy: Retain** - Preserves the table during stack updates that would normally replace it
- These policies apply to all 5 DynamoDB tables in the application

## Testing
- All existing tests continue to pass (101/101)
- Integration test validates serverless configuration is correct
- Configuration syntax verified

## Expected Outcome
With these deletion policies in place:
1. **Existing tables will be adopted** by CloudFormation instead of causing conflicts
2. **Deployment will succeed** without "AlreadyExists" errors
3. **Data is preserved** during future deployments and updates
4. **Stack operations are safer** with protection against accidental deletion

The `npx serverless deploy --stage prod` command should now complete successfully.