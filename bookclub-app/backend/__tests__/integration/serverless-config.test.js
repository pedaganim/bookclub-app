/**
 * Integration test to validate serverless configuration
 */
const fs = require('fs');
const path = require('path');

describe('Serverless Configuration', () => {
  let serverlessConfigContent;

  beforeAll(() => {
    const configPath = path.join(__dirname, '../../serverless.yml');
    serverlessConfigContent = fs.readFileSync(configPath, 'utf8');
  });

  test('should have all required DynamoDB tables defined', () => {
    // Check that all required tables are defined in Resources section
    expect(serverlessConfigContent).toContain('BooksTable:');
    expect(serverlessConfigContent).toContain('UsersTable:');
    expect(serverlessConfigContent).toContain('MetadataCacheTable:');
    expect(serverlessConfigContent).toContain('BookclubGroupsTable:');
    expect(serverlessConfigContent).toContain('BookclubMembersTable:');
    
    // Verify they are AWS::DynamoDB::Table types
    expect(serverlessConfigContent).toContain('Type: AWS::DynamoDB::Table');
    
    // Check table names match expected pattern
    expect(serverlessConfigContent).toContain('TableName: ${self:service}-books-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('TableName: ${self:service}-users-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('TableName: ${self:service}-metadata-cache-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('TableName: ${self:service}-bookclub-groups-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('TableName: ${self:service}-bookclub-members-${self:provider.stage}');
  });

  test('should have S3 bucket for book covers defined', () => {
    expect(serverlessConfigContent).toContain('BookCoversBucket:');
    expect(serverlessConfigContent).toContain('Type: AWS::S3::Bucket');
    expect(serverlessConfigContent).toContain('BucketName: ${self:service}-${self:provider.stage}-book-covers');
    expect(serverlessConfigContent).toContain('BookCoversBucketPolicy:');
    expect(serverlessConfigContent).toContain('Type: AWS::S3::BucketPolicy');
  });

  test('should have CloudFormation exports defined', () => {
    expect(serverlessConfigContent).toContain('Outputs:');
    expect(serverlessConfigContent).toContain('UserPoolId:');
    expect(serverlessConfigContent).toContain('UserPoolClientId:');
    expect(serverlessConfigContent).toContain('RestApiId:');
    
    // Check export names
    expect(serverlessConfigContent).toContain('Name: ${self:service}-${self:provider.stage}-UserPoolId');
    expect(serverlessConfigContent).toContain('Name: ${self:service}-${self:provider.stage}-UserPoolClientId');
    expect(serverlessConfigContent).toContain('Name: ${self:service}-${self:provider.stage}-RestApiId');
  });

  test('should have IAM permissions for all defined tables', () => {
    // Check DynamoDB permissions exist
    expect(serverlessConfigContent).toContain('dynamodb:Query');
    expect(serverlessConfigContent).toContain('dynamodb:Scan');
    expect(serverlessConfigContent).toContain('dynamodb:GetItem');
    expect(serverlessConfigContent).toContain('dynamodb:PutItem');
    expect(serverlessConfigContent).toContain('dynamodb:UpdateItem');
    expect(serverlessConfigContent).toContain('dynamodb:DeleteItem');
    
    // Check table ARNs are referenced
    expect(serverlessConfigContent).toContain('arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${self:service}-books-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${self:service}-users-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${self:service}-metadata-cache-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${self:service}-bookclub-groups-${self:provider.stage}');
    expect(serverlessConfigContent).toContain('arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/${self:service}-bookclub-members-${self:provider.stage}');
  });

  test('should have S3 permissions for book covers bucket', () => {
    expect(serverlessConfigContent).toContain('s3:PutObject');
    expect(serverlessConfigContent).toContain('s3:GetObject');
    expect(serverlessConfigContent).toContain('s3:DeleteObject');
    expect(serverlessConfigContent).toContain('arn:aws:s3:::${self:service}-${self:provider.stage}-book-covers/*');
  });

  test('should have Cognito resources defined', () => {
    expect(serverlessConfigContent).toContain('UserPool:');
    expect(serverlessConfigContent).toContain('Type: AWS::Cognito::UserPool');
    
    expect(serverlessConfigContent).toContain('UserPoolClient:');
    expect(serverlessConfigContent).toContain('Type: AWS::Cognito::UserPoolClient');
    
    expect(serverlessConfigContent).toContain('UserPoolDomain:');
    expect(serverlessConfigContent).toContain('Type: AWS::Cognito::UserPoolDomain');
  });

  test('should have proper table schemas defined', () => {
    // Check that tables have proper key schemas
    expect(serverlessConfigContent).toContain('KeySchema:');
    expect(serverlessConfigContent).toContain('AttributeDefinitions:');
    expect(serverlessConfigContent).toContain('ProvisionedThroughput:');
    
    // Check for Global Secondary Indexes where needed
    expect(serverlessConfigContent).toContain('GlobalSecondaryIndexes:');
    expect(serverlessConfigContent).toContain('UserIdIndex');
    expect(serverlessConfigContent).toContain('EmailIndex');
    expect(serverlessConfigContent).toContain('CreatedByIndex');
  });

  test('should have CORS configuration for S3 bucket', () => {
    expect(serverlessConfigContent).toContain('CorsConfiguration:');
    expect(serverlessConfigContent).toContain('CorsRules:');
    expect(serverlessConfigContent).toContain('AllowedHeaders:');
    expect(serverlessConfigContent).toContain('AllowedMethods:');
    expect(serverlessConfigContent).toContain('AllowedOrigins:');
  });

  test('should have custom resource function for DynamoDB table management', () => {
    // Check that the custom resource Lambda function is defined
    expect(serverlessConfigContent).toContain('dynamoTableManager:');
    expect(serverlessConfigContent).toContain('handler: src/custom-resources/dynamodb-table-manager.handler');
    expect(serverlessConfigContent).toContain('role: DynamoTableManagerRole');
    
    // Check that the IAM role for the custom resource is defined
    expect(serverlessConfigContent).toContain('DynamoTableManagerRole:');
    expect(serverlessConfigContent).toContain('Type: AWS::IAM::Role');
    expect(serverlessConfigContent).toContain('DynamoDBTableManager');
    
    // Check that the custom resource has proper permissions
    expect(serverlessConfigContent).toContain('dynamodb:CreateTable');
    expect(serverlessConfigContent).toContain('dynamodb:DescribeTable');
    expect(serverlessConfigContent).toContain('DynamoTableManagerInvokePermission:');
  });

  test('should have DeletionPolicy and UpdateReplacePolicy for all DynamoDB tables', () => {
    // This test ensures that all DynamoDB tables have retention policies
    // to prevent deployment conflicts when tables already exist
    const regularTableNames = [
      'BooksTable',
      'UsersTable'
    ];
    
    const customResourceTableNames = [
      'BookclubGroupsTable',
      'BookclubMembersTable',
      'MetadataCacheTable'
    ];

    // Check regular DynamoDB tables
    regularTableNames.forEach(tableName => {
      // Find the table definition section
      const tableDefRegex = new RegExp(`${tableName}:[\\s\\S]*?Properties:`, 'g');
      const tableMatch = serverlessConfigContent.match(tableDefRegex);
      
      expect(tableMatch).toBeTruthy();
      if (tableMatch) {
        const tableSection = tableMatch[0];
        expect(tableSection).toContain('DeletionPolicy: Retain');
        expect(tableSection).toContain('UpdateReplacePolicy: Retain');
      }
    });

    // Check custom resource tables have DeletionPolicy in Properties
    customResourceTableNames.forEach(tableName => {
      const tableDefRegex = new RegExp(`${tableName}:[\\s\\S]*?Properties:[\\s\\S]*?DeletionPolicy: Retain`, 'g');
      const tableMatch = serverlessConfigContent.match(tableDefRegex);
      
      expect(tableMatch).toBeTruthy();
      if (tableMatch) {
        expect(tableMatch[0]).toContain('Type: AWS::CloudFormation::CustomResource');
        expect(tableMatch[0]).toContain('DeletionPolicy: Retain');
      }
    });
  });
});