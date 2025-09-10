/**
 * Integration test to validate that the serverless configuration
 * does not have circular dependency issues that would prevent deployment
 */
const fs = require('fs');
const path = require('path');

describe('Serverless Configuration - Circular Dependency Validation', () => {
  let serverlessConfigContent;

  beforeAll(() => {
    const configPath = path.join(__dirname, '../../serverless.yml');
    serverlessConfigContent = fs.readFileSync(configPath, 'utf8');
  });

  test('should not have explicit dependency causing circular reference', () => {
    // The UserPoolClient should not have explicit DependsOn: GoogleIdentityProvider
    // as this can cause circular dependencies with auto-generated API Gateway resources
    expect(serverlessConfigContent).not.toContain('DependsOn: GoogleIdentityProvider');
  });

  test('should use regular S3 bucket instead of custom resource', () => {
    // S3 bucket should be a regular AWS::S3::Bucket, not a custom resource
    // to avoid dependency issues with custom resource Lambda functions
    expect(serverlessConfigContent).toContain('Type: AWS::S3::Bucket');
    expect(serverlessConfigContent).not.toContain('Action: CreateOrConfigureBucket');
  });

  test('should not reference missing S3BucketManager function', () => {
    // Should not have references to S3BucketManagerLambdaFunction if the function doesn't exist
    expect(serverlessConfigContent).not.toContain('S3BucketManagerLambdaFunction');
  });

  test('should have properly defined custom resource functions', () => {
    // Custom resource functions should be defined in functions section
    expect(serverlessConfigContent).toContain('dynamoTableManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/dynamodb-table-manager.handler');
    
    expect(serverlessConfigContent).toContain('cognitoResourceManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/cognito-resource-manager.handler');
  });

  test('should have retention policies for data protection', () => {
    // Resources should have retention policies to prevent data loss
    expect(serverlessConfigContent).toContain('DeletionPolicy: Retain');
    expect(serverlessConfigContent).toContain('UpdateReplacePolicy: Retain');
  });

  test('should have S3 bucket and bucket policy properly configured', () => {
    // Both bucket and bucket policy should be present
    expect(serverlessConfigContent).toContain('BookCoversBucket:');
    expect(serverlessConfigContent).toContain('BookCoversBucketPolicy:');
    expect(serverlessConfigContent).toContain('Type: AWS::S3::BucketPolicy');
  });

  test('should have proper IAM roles for custom resources', () => {
    // Custom resource functions should have dedicated IAM roles
    expect(serverlessConfigContent).toContain('DynamoTableManagerRole:');
    expect(serverlessConfigContent).toContain('CognitoResourceManagerRole:');
    
    // Should have proper permissions
    expect(serverlessConfigContent).toContain('DynamoTableManagerInvokePermission:');
    expect(serverlessConfigContent).toContain('CognitoResourceManagerInvokePermission:');
  });

  test('should not have problematic dependency patterns', () => {
    // Check for patterns that commonly cause circular dependencies
    const lines = serverlessConfigContent.split('\n');
    let inUserPoolClient = false;
    let foundProblematicPattern = false;
    
    for (const line of lines) {
      if (line.trim().startsWith('UserPoolClient:')) {
        inUserPoolClient = true;
      } else if (inUserPoolClient && line.trim().match(/^\w+:/)) {
        inUserPoolClient = false;
      }
      
      // Look for explicit dependencies in UserPoolClient that might cause issues
      if (inUserPoolClient && line.trim().startsWith('DependsOn:')) {
        const dependency = line.trim().split(':')[1].trim();
        if (dependency.includes('Lambda') || dependency.includes('Function')) {
          foundProblematicPattern = true;
        }
      }
    }
    
    expect(foundProblematicPattern).toBe(false);
  });
});