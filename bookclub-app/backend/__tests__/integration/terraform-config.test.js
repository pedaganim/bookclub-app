/**
 * Integration test to validate Terraform configuration has proper retention policies
 */
const fs = require('fs');
const path = require('path');

describe('Terraform Configuration', () => {
  let terraformDataStorageContent;
  let terraformBackendContent;

  beforeAll(() => {
    const dataStoragePath = path.join(__dirname, '../../terraform/data_storage.tf');
    const backendPath = path.join(__dirname, '../../terraform-backend/main.tf');
    
    terraformDataStorageContent = fs.readFileSync(dataStoragePath, 'utf8');
    terraformBackendContent = fs.readFileSync(backendPath, 'utf8');
  });

  test('should have prevent_destroy lifecycle for all DynamoDB tables', () => {
    const tableNames = [
      'books',
      'users', 
      'metadata_cache',
      'bookclub_groups',
      'bookclub_members'
    ];

    tableNames.forEach(tableName => {
      // More comprehensive regex to capture the entire resource block
      const tableResourceRegex = new RegExp(`resource "aws_dynamodb_table" "${tableName}" \\{[\\s\\S]*?\\n\\}(?=\\n\\n|\\nresource|$)`, 'g');
      const tableMatch = terraformDataStorageContent.match(tableResourceRegex);
      
      expect(tableMatch).toBeTruthy();
      if (tableMatch) {
        const tableSection = tableMatch[0];
        expect(tableSection).toContain('lifecycle {');
        expect(tableSection).toContain('prevent_destroy = true');
      }
    });
  });

  test('should have prevent_destroy lifecycle for S3 bucket', () => {
    // More comprehensive regex to capture the entire resource block  
    const bucketResourceRegex = new RegExp(`resource "aws_s3_bucket" "book_covers" \\{[\\s\\S]*?\\n\\}(?=\\n\\n|\\nresource|$)`, 'g');
    const bucketMatch = terraformDataStorageContent.match(bucketResourceRegex);
    
    expect(bucketMatch).toBeTruthy();
    if (bucketMatch) {
      const bucketSection = bucketMatch[0];
      expect(bucketSection).toContain('lifecycle {');
      expect(bucketSection).toContain('prevent_destroy = true');
    }
  });

  test('should have prevent_destroy lifecycle for Terraform backend resources', () => {
    // Check S3 bucket for Terraform state
    const stateBucketRegex = new RegExp(`resource "aws_s3_bucket" "tf_state" \\{[\\s\\S]*?\\n\\}`, 'g');
    const stateBucketMatch = terraformBackendContent.match(stateBucketRegex);
    
    expect(stateBucketMatch).toBeTruthy();
    if (stateBucketMatch) {
      const bucketSection = stateBucketMatch[0];
      expect(bucketSection).toContain('lifecycle {');
      expect(bucketSection).toContain('prevent_destroy = true');
    }

    // Check DynamoDB table for Terraform lock
    const lockTableRegex = new RegExp(`resource "aws_dynamodb_table" "tf_lock" \\{[\\s\\S]*?\\n\\}`, 'g');
    const lockTableMatch = terraformBackendContent.match(lockTableRegex);
    
    expect(lockTableMatch).toBeTruthy();
    if (lockTableMatch) {
      const tableSection = lockTableMatch[0];
      expect(tableSection).toContain('lifecycle {');
      expect(tableSection).toContain('prevent_destroy = true');
    }
  });

  test('should have all required DynamoDB table configurations', () => {
    // Verify that all tables have proper configurations
    expect(terraformDataStorageContent).toContain('billing_mode = "PAY_PER_REQUEST"');
    expect(terraformDataStorageContent).toContain('hash_key     =');
    expect(terraformDataStorageContent).toContain('attribute {');
    expect(terraformDataStorageContent).toContain('global_secondary_index {');
  });

  test('should have proper S3 bucket configurations', () => {
    // Verify S3 bucket configurations
    expect(terraformDataStorageContent).toContain('aws_s3_bucket_cors_configuration');
    expect(terraformDataStorageContent).toContain('aws_s3_bucket_public_access_block');
    expect(terraformDataStorageContent).toContain('aws_s3_bucket_policy');
  });

  test('should have SSM parameters for resource names', () => {
    // Verify that resource names are exposed via SSM for other systems
    expect(terraformDataStorageContent).toContain('aws_ssm_parameter');
    expect(terraformDataStorageContent).toContain('books_table_name');
    expect(terraformDataStorageContent).toContain('users_table_name');
    expect(terraformDataStorageContent).toContain('book_covers_bucket_name');
    expect(terraformDataStorageContent).toContain('metadata_cache_table_name');
    expect(terraformDataStorageContent).toContain('bookclub_groups_table_name');
    expect(terraformDataStorageContent).toContain('bookclub_members_table_name');
  });
});