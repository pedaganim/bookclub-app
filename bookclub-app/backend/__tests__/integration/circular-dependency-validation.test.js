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
    // Include external resources file content if present
    const resPath = path.join(__dirname, '../../cloudformation-resources.yml');
    if (fs.existsSync(resPath)) {
      try {
        serverlessConfigContent += '\n' + fs.readFileSync(resPath, 'utf8');
      } catch (_) {
        // ignore read errors
      }
    }
  });

  test('should not have explicit dependency causing circular reference', () => {
    // The UserPoolClient should not have explicit DependsOn: GoogleIdentityProvider
    // as this can cause circular dependencies with auto-generated API Gateway resources
    expect(serverlessConfigContent).not.toContain('DependsOn: GoogleIdentityProvider');
  });

  test('should use custom resource for S3 bucket to handle create-if-missing scenario', () => {
    // S3 bucket should use custom resource to avoid "bucket already exists" errors
    // This ensures graceful handling when bucket exists from previous deployments
    expect(serverlessConfigContent).toContain('Type: AWS::CloudFormation::CustomResource');
    expect(serverlessConfigContent).toContain('ServiceToken: !GetAtt S3BucketManagerLambdaFunction.Arn');
    expect(serverlessConfigContent).toContain('s3BucketManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/s3-bucket-manager.handler');
  });

  test('should not reference missing functions', () => {
    // Should have all referenced functions properly defined
    const functions = ['DynamoTableManagerLambdaFunction', 'CognitoResourceManagerLambdaFunction', 'S3BucketManagerLambdaFunction'];
    for (const func of functions) {
      if (serverlessConfigContent.includes(func)) {
        // If function is referenced, it should be defined in functions section
        let functionName = func.replace('LambdaFunction', '');
        // Convert from PascalCase to camelCase
        functionName = functionName.charAt(0).toLowerCase() + functionName.slice(1);
        expect(serverlessConfigContent).toContain(`${functionName}:`);
      }
    }
  });

  test('should have properly defined custom resource functions', () => {
    // Custom resource functions should be defined in functions section
    expect(serverlessConfigContent).toContain('dynamoTableManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/dynamodb-table-manager.handler');
    
    expect(serverlessConfigContent).toContain('cognitoResourceManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/cognito-resource-manager.handler');

    expect(serverlessConfigContent).toContain('s3BucketManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/s3-bucket-manager.handler');
  });

  test('should have retention policies for data protection', () => {
    // Resources should have retention policies to prevent data loss
    expect(serverlessConfigContent).toContain('DeletionPolicy: Retain');
    expect(serverlessConfigContent).toContain('UpdateReplacePolicy: Retain');
  });

  test('should have S3 bucket with create-if-missing functionality', () => {
    // Bucket should be managed by custom resource for graceful handling
    expect(serverlessConfigContent).toContain('BookCoversBucket:');
    expect(serverlessConfigContent).toContain('Type: AWS::CloudFormation::CustomResource');
    expect(serverlessConfigContent).toContain('EnablePublicRead: true');
  });

  test('should have proper IAM roles for custom resources', () => {
    // Custom resource functions should have dedicated IAM roles
    expect(serverlessConfigContent).toContain('DynamoTableManagerRole:');
    expect(serverlessConfigContent).toContain('CognitoResourceManagerRole:');
    expect(serverlessConfigContent).toContain('S3BucketManagerRole:');
    
    // Should have proper permissions
    expect(serverlessConfigContent).toContain('DynamoTableManagerInvokePermission:');
    expect(serverlessConfigContent).toContain('CognitoResourceManagerInvokePermission:');
    expect(serverlessConfigContent).toContain('S3BucketManagerInvokePermission:');
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