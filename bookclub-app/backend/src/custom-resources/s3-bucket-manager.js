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
    console.log(`Checking if bucket exists: ${bucketName}`);
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`Bucket exists: ${bucketName}`);
    return true;
  } catch (error) {
    if (error.code === 'NoSuchBucket' || error.code === 'NotFound') {
      console.log(`Bucket does not exist: ${bucketName}`);
      return false;
    }
    if (error.code === 'Forbidden') {
      // If we get Forbidden, the bucket might exist but we don't have permission to check
      // This can happen with buckets in different accounts. For our use case, assume it doesn't exist.
      console.log(`Bucket access forbidden (assuming doesn't exist): ${bucketName}`);
      return false;
    }
    console.error(`Error checking bucket existence: ${error.code} - ${error.message}`);
    throw error;
  }
};

const createBucket = async (params) => {
  try {
    console.log('Creating S3 bucket:', params.Bucket);
    const result = await s3.createBucket(params).promise();
    console.log('S3 bucket created successfully:', params.Bucket);
    
    // Wait for bucket to be available
    console.log('Waiting for bucket to become available...');
    await s3.waitFor('bucketExists', { Bucket: params.Bucket }).promise();
    console.log('S3 bucket is now available:', params.Bucket);
    
    return result;
  } catch (error) {
    if (error.code === 'BucketAlreadyExists' || error.code === 'BucketAlreadyOwnedByYou') {
      // Bucket already exists, this is OK for our use case
      console.log('Bucket already exists, adopting it:', params.Bucket);
      return { Location: `/${params.Bucket}` };
    }
    console.error(`Error creating bucket: ${error.code} - ${error.message}`);
    throw error;
  }
};

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const fetchCurrentBucketState = async (bucketName) => {
  const state = { cors: null, pab: null, policy: null };
  // CORS
  try {
    const cors = await s3.getBucketCors({ Bucket: bucketName }).promise();
    state.cors = cors?.CORSConfiguration || cors || null;
  } catch (e) {
    if (e.code !== 'NoSuchCORSConfiguration' && e.code !== 'NotFound') {
      console.log('getBucketCors error (ignored):', e.code || e.message);
    }
  }
  // Public Access Block
  try {
    const pab = await s3.getPublicAccessBlock({ Bucket: bucketName }).promise();
    state.pab = pab?.PublicAccessBlockConfiguration || null;
  } catch (e) {
    if (e.code !== 'NoSuchPublicAccessBlockConfiguration' && e.code !== 'NoSuchBucket' && e.code !== 'NotFound') {
      console.log('getPublicAccessBlock error (ignored):', e.code || e.message);
    }
  }
  // Policy
  try {
    const pol = await s3.getBucketPolicy({ Bucket: bucketName }).promise();
    state.policy = JSON.parse(pol?.Policy || '{}');
  } catch (e) {
    if (e.code !== 'NoSuchBucketPolicy' && e.code !== 'NoSuchBucket' && e.code !== 'NotFound') {
      console.log('getBucketPolicy error (ignored):', e.code || e.message);
    }
  }
  return state;
};

const desiredPublicReadPolicy = (bucketName) => ({
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
});

const configureBucket = async (bucketName, config) => {
  const current = await fetchCurrentBucketState(bucketName);
  let changed = false;

  // CORS (compare and only update if needed)
  if (config.CorsConfiguration) {
    const desiredCors = { CORSRules: config.CorsConfiguration.CorsRules || config.CorsConfiguration.CORSRules || config.CorsConfiguration };
    const currentCors = current.cors ? (current.cors.CORSRules ? current.cors : { CORSRules: current.cors }) : null;
    if (!currentCors || !deepEqual(desiredCors, currentCors)) {
      try {
        console.log('Updating CORS configuration for bucket:', bucketName);
        await s3.putBucketCors({ Bucket: bucketName, CORSConfiguration: desiredCors }).promise();
        changed = true;
      } catch (error) {
        console.log('Error configuring CORS, but continuing:', error.message);
      }
    } else {
      console.log('CORS configuration already up-to-date');
    }
  }

  // Public Access Block (compare and only update if needed)
  if (config.PublicAccessBlockConfiguration) {
    const desiredPab = config.PublicAccessBlockConfiguration;
    if (!current.pab || !deepEqual(desiredPab, current.pab)) {
      try {
        console.log('Updating public access block configuration for bucket:', bucketName);
        await s3.putPublicAccessBlock({ Bucket: bucketName, PublicAccessBlockConfiguration: desiredPab }).promise();
        changed = true;
      } catch (error) {
        console.log('Error configuring public access block, but continuing:', error.message);
      }
    } else {
      console.log('Public access block configuration already up-to-date');
    }
  }

  // Bucket policy for public read (compare and only update if needed)
  if (config.EnablePublicRead) {
    const desired = desiredPublicReadPolicy(bucketName);
    const isSame = current.policy && deepEqual(current.policy, desired);
    if (!isSame) {
      try {
        console.log('Updating bucket policy for public read access:', bucketName);
        await s3.putBucketPolicy({ Bucket: bucketName, Policy: JSON.stringify(desired) }).promise();
        changed = true;
      } catch (error) {
        console.log('Error configuring bucket policy, but continuing:', error.message);
      }
    } else {
      console.log('Bucket policy already up-to-date');
    }
  }

  if (!changed) {
    console.log('No bucket configuration changes detected. Skipping updates.');
  } else {
    console.log('Bucket configuration completed for:', bucketName);
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

  console.log(`Processing ${RequestType} request for bucket: ${BucketName}`);

  try {
    let result;
    
    switch (RequestType) {
      case 'Create':
        console.log(`Starting Create operation for bucket: ${BucketName}`);
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
        console.log(`Create operation completed successfully for bucket: ${BucketName}`);
        break;

      case 'Update':
        console.log('Updating S3 bucket configuration:', BucketName);
        await configureBucket(BucketName, {
          CorsConfiguration,
          PublicAccessBlockConfiguration,
          EnablePublicRead
        });
        result = { Location: `/${BucketName}` };
        console.log(`Update operation completed successfully for bucket: ${BucketName}`);
        break;

      case 'Delete':
        console.log(`Starting Delete operation for bucket: ${BucketName}`);
        // Only delete if DeletionPolicy is not Retain
        if (ResourceProperties.DeletionPolicy !== 'Retain') {
          await deleteBucket(BucketName);
        } else {
          console.log(`DeletionPolicy is Retain, keeping bucket: ${BucketName}`);
        }
        result = {};
        console.log(`Delete operation completed successfully for bucket: ${BucketName}`);
        break;

      default:
        throw new Error(`Unknown request type: ${RequestType}`);
    }

    console.log('Sending SUCCESS response to CloudFormation');
    await sendResponse(event, context, 'SUCCESS', { BucketName }, BucketName);
  } catch (error) {
    console.error('Error occurred:', error);
    console.error('Error stack:', error.stack);
    await sendResponse(event, context, 'FAILED', { Error: error.message });
  }
};