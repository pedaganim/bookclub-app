/**
 * Custom CloudFormation resource to handle Cognito Identity Provider creation.
 * This function will:
 * - Check if an identity provider exists before trying to create it
 * - If it exists, update it with new configuration
 * - If it doesn't exist, create it with the specified configuration
 * - Handle updates and deletes appropriately
 */

const AWS = require('aws-sdk');

const cognitoIdp = new AWS.CognitoIdentityServiceProvider();

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

const identityProviderExists = async (userPoolId, providerName) => {
  try {
    await cognitoIdp.describeIdentityProvider({
      UserPoolId: userPoolId,
      ProviderName: providerName
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
};

const createIdentityProvider = async (params) => {
  try {
    console.log('Creating Cognito Identity Provider:', params.ProviderName);
    const result = await cognitoIdp.createIdentityProvider(params).promise();
    console.log('Identity Provider created successfully:', params.ProviderName);
    return result;
  } catch (error) {
    if (error.code === 'DuplicateProviderException') {
      // Provider already exists, this is OK for our use case
      console.log('Identity Provider already exists, will update it:', params.ProviderName);
      return await updateIdentityProvider(params);
    }
    throw error;
  }
};

const updateIdentityProvider = async (params) => {
  try {
    console.log('Updating Cognito Identity Provider:', params.ProviderName);
    const updateParams = {
      UserPoolId: params.UserPoolId,
      ProviderName: params.ProviderName,
      ProviderDetails: params.ProviderDetails,
      AttributeMapping: params.AttributeMapping
    };
    
    const result = await cognitoIdp.updateIdentityProvider(updateParams).promise();
    console.log('Identity Provider updated successfully:', params.ProviderName);
    return result;
  } catch (error) {
    console.log('Error updating identity provider:', error.message);
    throw error;
  }
};

const deleteIdentityProvider = async (userPoolId, providerName) => {
  try {
    // Check if provider exists before trying to delete
    const exists = await identityProviderExists(userPoolId, providerName);
    if (!exists) {
      console.log('Identity Provider does not exist, nothing to delete:', providerName);
      return;
    }

    console.log('Deleting Cognito Identity Provider:', providerName);
    await cognitoIdp.deleteIdentityProvider({
      UserPoolId: userPoolId,
      ProviderName: providerName
    }).promise();
    
    console.log('Identity Provider deleted successfully:', providerName);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log('Identity Provider does not exist, nothing to delete:', providerName);
      return;
    }
    throw error;
  }
};

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { RequestType, ResourceProperties } = event;
  const { Action, UserPoolId, ProviderName, ProviderType, ProviderDetails, AttributeMapping } = ResourceProperties;

  try {
    let result;
    const physicalResourceId = `${UserPoolId}-${ProviderName}`;
    
    switch (RequestType) {
      case 'Create':
        if (Action === 'CreateOrUpdateIdentityProvider') {
          const exists = await identityProviderExists(UserPoolId, ProviderName);
          if (exists) {
            console.log(`Identity Provider ${ProviderName} already exists, updating it`);
            result = await updateIdentityProvider({
              UserPoolId,
              ProviderName,
              ProviderType,
              ProviderDetails,
              AttributeMapping
            });
          } else {
            result = await createIdentityProvider({
              UserPoolId,
              ProviderName,
              ProviderType,
              ProviderDetails,
              AttributeMapping
            });
          }
        } else {
          throw new Error(`Unknown action: ${Action}`);
        }
        break;

      case 'Update':
        if (Action === 'CreateOrUpdateIdentityProvider') {
          result = await updateIdentityProvider({
            UserPoolId,
            ProviderName,
            ProviderType,
            ProviderDetails,
            AttributeMapping
          });
        } else {
          throw new Error(`Unknown action: ${Action}`);
        }
        break;

      case 'Delete':
        // Only delete if DeletionPolicy is not Retain
        if (ResourceProperties.DeletionPolicy !== 'Retain') {
          await deleteIdentityProvider(UserPoolId, ProviderName);
        } else {
          console.log(`DeletionPolicy is Retain, keeping Identity Provider: ${ProviderName}`);
        }
        result = {};
        break;

      default:
        throw new Error(`Unknown request type: ${RequestType}`);
    }

    await sendResponse(event, context, 'SUCCESS', { ProviderName }, physicalResourceId);
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, context, 'FAILED', { Error: error.message });
  }
};