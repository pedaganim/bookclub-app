/**
 * Custom CloudFormation resource to handle Cognito Identity Provider creation.
 * This function will:
 * - Check if an identity provider exists before trying to create it
 * - If it exists, update it with new configuration
 * - If it doesn't exist, create it with the specified configuration
 * - Handle updates and deletes appropriately
 */

const AWS = require('aws-sdk');

const cognitoIdp = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION || 'us-east-1' });

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
  const { Action } = ResourceProperties;

  try {
    let result = {};
    let physicalResourceId = event.PhysicalResourceId || context.logStreamName;
    
    switch (RequestType) {
      case 'Create':
      case 'Update':
        if (Action === 'CreateOrUpdateIdentityProvider') {
          const { UserPoolId, ProviderName, ProviderType, ProviderDetails, AttributeMapping } = ResourceProperties;
          physicalResourceId = `${UserPoolId}-${ProviderName}`;
          const exists = await identityProviderExists(UserPoolId, ProviderName);
          if (exists) {
            console.log(`Identity Provider ${ProviderName} already exists, updating it`);
            await updateIdentityProvider({
              UserPoolId,
              ProviderName,
              ProviderType,
              ProviderDetails,
              AttributeMapping
            });
          } else {
            await createIdentityProvider({
              UserPoolId,
              ProviderName,
              ProviderType,
              ProviderDetails,
              AttributeMapping
            });
          }
          result = { ProviderName };
        } else if (Action === 'EnsureUserPool') {
          const { UserPoolId: providedPoolId, UserPoolName, Policies, Schema, AutoVerifiedAttributes } = ResourceProperties;
          const accountId = context.invokedFunctionArn.split(':')[4];
          const region = process.env.AWS_REGION || 'us-east-1';
          let adopted = false;

          // If a known pool ID is provided, verify it exists and adopt it directly
          if (providedPoolId && providedPoolId.trim()) {
            console.log(`UserPoolId provided (${providedPoolId}), verifying it exists...`);
            try {
              const descRes = await cognitoIdp.describeUserPool({ UserPoolId: providedPoolId }).promise();
              const pool = descRes.UserPool;
              console.log(`Found existing User Pool by ID: ${pool.Id} (${pool.Name})`);
              physicalResourceId = pool.Id;
              result = { UserPoolId: pool.Id, Arn: pool.Arn || `arn:aws:cognito-idp:${region}:${accountId}:userpool/${pool.Id}` };
              adopted = true;
            } catch (descErr) {
              console.warn(`Could not describe UserPool ${providedPoolId}: ${descErr.message} - falling back to name search`);
            }
          }

          if (!adopted) {
            // Paginated search by name
            console.log(`Searching for User Pool by name: ${UserPoolName}`);
            let existingPool = null;
            let nextToken = null;
            do {
              const listParams = { MaxResults: 60 };
              if (nextToken) listParams.NextToken = nextToken;
              const listRes = await cognitoIdp.listUserPools(listParams).promise();
              existingPool = (listRes.UserPools || []).find(p => p.Name === UserPoolName);
              nextToken = listRes.NextToken;
            } while (!existingPool && nextToken);

            if (existingPool) {
              console.log(`Found User Pool by name: ${existingPool.Id}`);
              physicalResourceId = existingPool.Id;
              result = { UserPoolId: existingPool.Id, Arn: `arn:aws:cognito-idp:${region}:${accountId}:userpool/${existingPool.Id}` };
            } else {
              console.log(`Creating new User Pool: ${UserPoolName}`);
              const createRes = await cognitoIdp.createUserPool({
                PoolName: UserPoolName,
                Policies,
                Schema,
                AutoVerifiedAttributes
              }).promise();
              physicalResourceId = createRes.UserPool.Id;
              result = { UserPoolId: createRes.UserPool.Id, Arn: createRes.UserPool.Arn };
            }
          }
        } else if (Action === 'EnsureUserPoolClient') {
          const { UserPoolId, ClientName, ExplicitAuthFlows, PreventUserExistenceErrors, SupportedIdentityProviders, AllowedOAuthFlows, AllowedOAuthScopes, CallbackURLs, LogoutURLs, AllowedOAuthFlowsUserPoolClient } = ResourceProperties;
          
          // List clients for the pool
          const listRes = await cognitoIdp.listUserPoolClients({ UserPoolId, MaxResults: 60 }).promise();
          const existingClient = (listRes.UserPoolClients || []).find(c => c.ClientName === ClientName);
          
          const clientParams = {
            UserPoolId,
            ClientName,
            ExplicitAuthFlows,
            PreventUserExistenceErrors,
            SupportedIdentityProviders,
            AllowedOAuthFlows,
            AllowedOAuthScopes,
            CallbackURLs,
            LogoutURLs,
            AllowedOAuthFlowsUserPoolClient
          };

          if (existingClient) {
            console.log(`User Pool Client ${ClientName} already exists, adopting and updating it: ${existingClient.ClientId}`);
            physicalResourceId = existingClient.ClientId;
            await cognitoIdp.updateUserPoolClient({
              ...clientParams,
              ClientId: existingClient.ClientId
            }).promise();
            result = { ClientId: existingClient.ClientId };
          } else {
            console.log(`Creating new User Pool Client: ${ClientName}`);
            const createRes = await cognitoIdp.createUserPoolClient(clientParams).promise();
            physicalResourceId = createRes.UserPoolClient.ClientId;
            result = { ClientId: createRes.UserPoolClient.ClientId };
          }
        } else if (Action === 'EnsureUserPoolDomain') {
          const { UserPoolId, Domain } = ResourceProperties;
          physicalResourceId = Domain;

          try {
            const descRes = await cognitoIdp.describeUserPoolDomain({ Domain }).promise();
            if (descRes.DomainDescription && descRes.DomainDescription.UserPoolId === UserPoolId) {
              console.log(`Domain ${Domain} already exists for this User Pool, adopting it.`);
            } else if (descRes.DomainDescription) {
              console.log(`Domain ${Domain} exists but for a DIFFERENT User Pool (${descRes.DomainDescription.UserPoolId}). Deleting and recreating...`);
              await cognitoIdp.deleteUserPoolDomain({ Domain, UserPoolId: descRes.DomainDescription.UserPoolId }).promise();
              await cognitoIdp.createUserPoolDomain({ Domain, UserPoolId }).promise();
            }
          } catch (e) {
            if (e.code === 'ResourceNotFoundException') {
              console.log(`Creating new User Pool Domain: ${Domain}`);
              await cognitoIdp.createUserPoolDomain({ Domain, UserPoolId }).promise();
            } else {
              throw e;
            }
          }
          result = { Domain };
        } else {
          throw new Error(`Unknown action: ${Action}`);
        }
        break;

      case 'Delete':
        if (ResourceProperties.DeletionPolicy === 'Retain') {
          console.log(`DeletionPolicy is Retain, keeping resource`);
        } else if (Action === 'CreateOrUpdateIdentityProvider') {
          await deleteIdentityProvider(ResourceProperties.UserPoolId, ResourceProperties.ProviderName);
        } else if (Action === 'EnsureUserPoolDomain') {
          await cognitoIdp.deleteUserPoolDomain({ Domain: ResourceProperties.Domain, UserPoolId: ResourceProperties.UserPoolId }).promise();
        }
        // We typically don't auto-delete UserPools or Clients in this manager for safety
        result = {};
        break;

      default:
        throw new Error(`Unknown request type: ${RequestType}`);
    }

    await sendResponse(event, context, 'SUCCESS', result, physicalResourceId);
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, context, 'FAILED', { Error: error.message });
  }
};