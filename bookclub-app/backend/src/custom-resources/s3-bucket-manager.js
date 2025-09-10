/**
 * Custom CloudFormation resource to handle S3 bucket creation gracefully.
 * This function will:
 * - Check if a bucket exists before trying to create it
 * - If it exists, adopt it (return success)
 * - If it doesn't exist, create it with the specified configuration
 * - Handle updates and deletes appropriately
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const sendResponse = async (event, context, responseStatus, responseData = {}, physicalResourceId = null) => {
  const responseUrl = event.ResponseURL;
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log('Response body:', responseBody);

  const https = require('https');
  const url = require('url');

  const parsedUrl = url.parse(responseUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log('Status code:', response.statusCode);
      console.log('Status message:', response.statusMessage);
      resolve();
    });

    request.on('error', (error) => {
      console.log('Error:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
};

const bucketExists = async (bucketName) => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NoSuchBucket' || error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

const createBucket = async (params) => {
  try {
    console.log('Creating S3 bucket:', params.Bucket);
    const result = await s3.createBucket(params).promise();
    
    // Wait for bucket to be available
    console.log('Waiting for bucket to become available...');
    await s3.waitFor('bucketExists', { Bucket: params.Bucket }).promise();
    
    return result;
  } catch (error) {
    if (error.code === 'BucketAlreadyExists' || error.code === 'BucketAlreadyOwnedByYou') {
      // Bucket already exists, this is OK for our use case
      console.log('Bucket already exists, adopting it:', params.Bucket);
      return { Location: `/${params.Bucket}` };
    }
    throw error;
  }
};

const configureBucket = async (bucketName, config) => {
  try {
    // Set CORS configuration if provided
    if (config.CorsConfiguration) {
      console.log('Setting CORS configuration for bucket:', bucketName);
      await s3.putBucketCors({
        Bucket: bucketName,
        CORSConfiguration: config.CorsConfiguration
      }).promise();
    }

    // Set public access block configuration if provided
    if (config.PublicAccessBlockConfiguration) {
      console.log('Setting public access block configuration for bucket:', bucketName);
      await s3.putPublicAccessBlock({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: config.PublicAccessBlockConfiguration
      }).promise();
    }

    // Set bucket policy if needed for public read access
    if (config.EnablePublicRead) {
      console.log('Setting bucket policy for public read access:', bucketName);
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucketName}/*`
          }
        ]
      };
      
      await s3.putBucketPolicy({
        Bucket: bucketName,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
    }

    console.log('Bucket configuration completed for:', bucketName);
  } catch (error) {
    console.log('Error configuring bucket, but continuing:', error.message);
    // Don't fail the entire operation if configuration fails
  }
};

const deleteBucket = async (bucketName) => {
  try {
    // Check if bucket exists before trying to delete
    const exists = await bucketExists(bucketName);
    if (!exists) {
      console.log('Bucket does not exist, nothing to delete:', bucketName);
      return;
    }

    console.log('Note: S3 bucket deletion is typically handled via DeletionPolicy: Retain for safety');
    console.log('Bucket will be retained:', bucketName);
    
    // In production, you typically want to retain buckets to avoid data loss
    // If you really want to delete, you'd need to:
    // 1. Empty the bucket first (list and delete all objects)
    // 2. Then delete the bucket
    // But for safety, we'll just log this action
    
  } catch (error) {
    console.log('Error during bucket deletion check:', error.message);
  }
};

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { RequestType, ResourceProperties } = event;
  const { 
    BucketName, 
    CorsConfiguration, 
    PublicAccessBlockConfiguration,
    EnablePublicRead 
  } = ResourceProperties;

  try {
    let result;
    
    switch (RequestType) {
      case 'Create':
        const exists = await bucketExists(BucketName);
        if (exists) {
          console.log(`Bucket ${BucketName} already exists, adopting it`);
          result = { Location: `/${BucketName}` };
        } else {
          const createParams = {
            Bucket: BucketName
          };

          result = await createBucket(createParams);
        }
        
        // Configure the bucket (whether it existed or was just created)
        await configureBucket(BucketName, {
          CorsConfiguration,
          PublicAccessBlockConfiguration,
          EnablePublicRead
        });
        break;

      case 'Update':
        console.log('Updating S3 bucket configuration:', BucketName);
        await configureBucket(BucketName, {
          CorsConfiguration,
          PublicAccessBlockConfiguration,
          EnablePublicRead
        });
        result = { Location: `/${BucketName}` };
        break;

      case 'Delete':
        // Only delete if DeletionPolicy is not Retain
        if (ResourceProperties.DeletionPolicy !== 'Retain') {
          await deleteBucket(BucketName);
        } else {
          console.log(`DeletionPolicy is Retain, keeping bucket: ${BucketName}`);
        }
        result = {};
        break;

      default:
        throw new Error(`Unknown request type: ${RequestType}`);
    }

    await sendResponse(event, context, 'SUCCESS', { BucketName }, BucketName);
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, context, 'FAILED', { Error: error.message });
  }
};