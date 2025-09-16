/**
 * Custom CloudFormation resource to handle DynamoDB table creation gracefully.
 * This function will:
 * - Check if a table exists before trying to create it
 * - If it exists, adopt it (return success)
 * - If it doesn't exist, create it with the specified configuration
 * - Handle updates and deletes appropriately
 */

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB();

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

const tableExists = async (tableName) => {
  try {
    await dynamodb.describeTable({ TableName: tableName }).promise();
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
};

const createTable = async (params) => {
  try {
    console.log('Creating DynamoDB table:', params.TableName);
    const result = await dynamodb.createTable(params).promise();
    
    // Wait for table to become active
    console.log('Waiting for table to become active...');
    await dynamodb.waitFor('tableExists', { TableName: params.TableName }).promise();
    
    return result;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      // Table already exists, this is OK for our use case
      console.log('Table already exists, adopting it:', params.TableName);
      return { TableDescription: { TableName: params.TableName } };
    }
    throw error;
  }
};

const updateTable = async (tableName, updateParams) => {
  try {
    console.log('Updating DynamoDB table:', tableName);
    const params = { TableName: tableName };

    if (updateParams.StreamSpecification) {
      params.StreamSpecification = updateParams.StreamSpecification;
      console.log('Applying StreamSpecification update:', JSON.stringify(params.StreamSpecification));
    }

    // If nothing to update, short-circuit
    if (!params.StreamSpecification) {
      console.log('No updatable properties provided, skipping update.');
      return { TableDescription: { TableName: tableName } };
    }

    await dynamodb.updateTable(params).promise();
    // Wait for table to be updated
    await dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
    return { TableDescription: { TableName: tableName } };
  } catch (error) {
    console.log('Error updating table, but continuing:', error.message);
    return { TableDescription: { TableName: tableName } };
  }
};

const deleteTable = async (tableName) => {
  try {
    // Check if table exists before trying to delete
    const exists = await tableExists(tableName);
    if (!exists) {
      console.log('Table does not exist, nothing to delete:', tableName);
      return;
    }

    console.log('Deleting DynamoDB table:', tableName);
    await dynamodb.deleteTable({ TableName: tableName }).promise();
    
    // Wait for table to be deleted
    console.log('Waiting for table to be deleted...');
    await dynamodb.waitFor('tableNotExists', { TableName: tableName }).promise();
    
    console.log('Table deleted successfully:', tableName);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log('Table does not exist, nothing to delete:', tableName);
      return;
    }
    throw error;
  }
};

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { RequestType, ResourceProperties } = event;
  const { TableName, AttributeDefinitions, KeySchema, GlobalSecondaryIndexes, ProvisionedThroughput, TimeToLiveSpecification } = ResourceProperties;

  try {
    let result;
    
    switch (RequestType) {
      case 'Create':
        const exists = await tableExists(TableName);
        if (exists) {
          console.log(`Table ${TableName} already exists, adopting it`);
          // If a StreamSpecification is requested, ensure it's applied on the existing table
          if (ResourceProperties.StreamSpecification) {
            console.log('Ensuring StreamSpecification is enabled on existing table...');
            await updateTable(TableName, { StreamSpecification: ResourceProperties.StreamSpecification });
          }
          result = { TableDescription: { TableName } };
        } else {
          const createParams = {
            TableName,
            AttributeDefinitions,
            KeySchema,
            ProvisionedThroughput
          };

          if (GlobalSecondaryIndexes && GlobalSecondaryIndexes.length > 0) {
            createParams.GlobalSecondaryIndexes = GlobalSecondaryIndexes;
          }

          if (ResourceProperties.StreamSpecification) {
            createParams.StreamSpecification = ResourceProperties.StreamSpecification;
          }

          result = await createTable(createParams);
          
          // Set TTL if specified
          if (TimeToLiveSpecification) {
            console.log('Setting TTL configuration...');
            await dynamodb.updateTimeToLive({
              TableName,
              TimeToLiveSpecification
            }).promise();
          }
        }
        break;

      case 'Update':
        result = await updateTable(TableName, ResourceProperties);
        break;

      case 'Delete':
        // Only delete if DeletionPolicy is not Retain
        if (ResourceProperties.DeletionPolicy !== 'Retain') {
          await deleteTable(TableName);
        } else {
          console.log(`DeletionPolicy is Retain, keeping table: ${TableName}`);
        }
        result = {};
        break;

      default:
        throw new Error(`Unknown request type: ${RequestType}`);
    }

    // Describe table to fetch StreamArn if available (poll until present)
    let streamArn = null;
    const maxAttempts = 10;
    const delayMs = 3000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const desc = await dynamodb.describeTable({ TableName }).promise();
        streamArn = desc?.Table?.LatestStreamArn || null;
        if (streamArn) {
          console.log(`Obtained StreamArn on attempt ${attempt}: ${streamArn}`);
          break;
        }
        console.log(`StreamArn not yet available (attempt ${attempt}/${maxAttempts}), waiting ${delayMs}ms...`);
      } catch (e) {
        console.log(`DescribeTable failed (attempt ${attempt}/${maxAttempts}):`, e.message);
      }
      await new Promise(r => setTimeout(r, delayMs));
    }

    await sendResponse(event, context, 'SUCCESS', { TableName, StreamArn: streamArn }, TableName);
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, context, 'FAILED', { Error: error.message });
  }
};