/**
 * Unit tests for Cognito Resource Manager Custom Resource
 */

// Mock AWS SDK before importing the module
const mockCognitoIdpPromise = jest.fn();
const mockCognitoIdp = {
  describeIdentityProvider: jest.fn(() => ({ promise: mockCognitoIdpPromise })),
  createIdentityProvider: jest.fn(() => ({ promise: mockCognitoIdpPromise })),
  updateIdentityProvider: jest.fn(() => ({ promise: mockCognitoIdpPromise })),
  deleteIdentityProvider: jest.fn(() => ({ promise: mockCognitoIdpPromise }))
};

jest.mock('aws-sdk', () => ({
  CognitoIdentityServiceProvider: jest.fn().mockImplementation(() => mockCognitoIdp)
}));

// Mock HTTPS module for CloudFormation response
const mockHttpsRequest = jest.fn();
jest.mock('https', () => ({
  request: mockHttpsRequest
}));

const cognitoResourceManager = require('../../../src/custom-resources/cognito-resource-manager');

describe('Cognito Resource Manager Custom Resource', () => {
  let mockRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock https request
    mockRequest = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    };
    
    mockHttpsRequest.mockImplementation((options, callback) => {
      // Simulate successful response
      if (callback) {
        callback({ statusCode: 200, statusMessage: 'OK' });
      }
      return mockRequest;
    });
  });

  const createMockEvent = (requestType, providerName = 'Google') => ({
    RequestType: requestType,
    ResponseURL: 'https://test-url.com',
    StackId: 'test-stack-id',
    RequestId: 'test-request-id',
    LogicalResourceId: 'GoogleIdentityProvider',
    ResourceProperties: {
      Action: 'CreateOrUpdateIdentityProvider',
      UserPoolId: 'us-east-1_EXAMPLE',
      ProviderName: providerName,
      ProviderType: 'Google',
      ProviderDetails: {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        authorize_scopes: 'openid email profile'
      },
      AttributeMapping: {
        email: 'email',
        given_name: 'given_name',
        family_name: 'family_name',
        name: 'name'
      }
    }
  });

  const mockContext = {
    logStreamName: 'test-log-stream'
  };

  describe('Create operations', () => {
    test('should create identity provider when it does not exist', async () => {
      const event = createMockEvent('Create');
      
      // Mock provider does not exist
      mockCognitoIdpPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' }) // describeIdentityProvider fails
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } }); // createIdentityProvider succeeds

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.describeIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
      expect(mockCognitoIdp.createIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google',
        ProviderType: 'Google',
        ProviderDetails: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          authorize_scopes: 'openid email profile'
        },
        AttributeMapping: {
          email: 'email',
          given_name: 'given_name',
          family_name: 'family_name',
          name: 'name'
        }
      });
    });

    test('should update existing identity provider when it already exists', async () => {
      const event = createMockEvent('Create');
      
      // Mock provider already exists
      mockCognitoIdpPromise
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } }) // describeIdentityProvider succeeds
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } }); // updateIdentityProvider succeeds

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.describeIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
      expect(mockCognitoIdp.updateIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google',
        ProviderDetails: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          authorize_scopes: 'openid email profile'
        },
        AttributeMapping: {
          email: 'email',
          given_name: 'given_name',
          family_name: 'family_name',
          name: 'name'
        }
      });
      expect(mockCognitoIdp.createIdentityProvider).not.toHaveBeenCalled();
    });

    test('should handle DuplicateProviderException gracefully', async () => {
      const event = createMockEvent('Create');
      
      // Mock provider does not exist initially but creation fails with DuplicateProviderException
      mockCognitoIdpPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' }) // describeIdentityProvider fails
        .mockRejectedValueOnce({ code: 'DuplicateProviderException' }) // createIdentityProvider fails
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } }); // updateIdentityProvider succeeds

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.describeIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
      expect(mockCognitoIdp.createIdentityProvider).toHaveBeenCalled();
      expect(mockCognitoIdp.updateIdentityProvider).toHaveBeenCalled();
    });
  });

  describe('Update operations', () => {
    test('should update identity provider configuration', async () => {
      const event = createMockEvent('Update');
      
      mockCognitoIdpPromise.mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } });

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.updateIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google',
        ProviderDetails: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          authorize_scopes: 'openid email profile'
        },
        AttributeMapping: {
          email: 'email',
          given_name: 'given_name',
          family_name: 'family_name',
          name: 'name'
        }
      });
    });
  });

  describe('Delete operations', () => {
    test('should delete identity provider when DeletionPolicy is not Retain', async () => {
      const event = createMockEvent('Delete');
      
      // Mock provider exists and can be deleted
      mockCognitoIdpPromise
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } }) // describeIdentityProvider succeeds
        .mockResolvedValueOnce(); // deleteIdentityProvider succeeds

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.describeIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
      expect(mockCognitoIdp.deleteIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
    });

    test('should not delete identity provider when DeletionPolicy is Retain', async () => {
      const event = createMockEvent('Delete');
      event.ResourceProperties.DeletionPolicy = 'Retain';

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.deleteIdentityProvider).not.toHaveBeenCalled();
    });

    test('should handle provider not found during delete', async () => {
      const event = createMockEvent('Delete');
      
      // Mock provider does not exist
      mockCognitoIdpPromise.mockRejectedValueOnce({ code: 'ResourceNotFoundException' });

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockCognitoIdp.describeIdentityProvider).toHaveBeenCalledWith({
        UserPoolId: 'us-east-1_EXAMPLE',
        ProviderName: 'Google'
      });
      expect(mockCognitoIdp.deleteIdentityProvider).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should send FAILED response on error', async () => {
      const event = createMockEvent('Create');
      
      // Mock unexpected error
      mockCognitoIdpPromise.mockRejectedValue(new Error('Unexpected Cognito error'));

      await cognitoResourceManager.handler(event, mockContext);

      // Should send FAILED response
      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0];
      expect(callArgs[0].method).toBe('PUT');
      
      // Check that response body contains error status
      const writeCall = mockRequest.write.mock.calls[0];
      const responseBody = JSON.parse(writeCall[0]);
      expect(responseBody.Status).toBe('FAILED');
      expect(responseBody.Data.Error).toBe('Unexpected Cognito error');
    });

    test('should handle unknown request type', async () => {
      const event = createMockEvent('Unknown');

      await cognitoResourceManager.handler(event, mockContext);

      // Should send FAILED response
      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0];
      expect(callArgs[0].method).toBe('PUT');
      
      // Check that response body contains error status
      const writeCall = mockRequest.write.mock.calls[0];
      const responseBody = JSON.parse(writeCall[0]);
      expect(responseBody.Status).toBe('FAILED');
      expect(responseBody.Data.Error).toContain('Unknown request type');
    });

    test('should handle unknown action', async () => {
      const event = createMockEvent('Create');
      event.ResourceProperties.Action = 'UnknownAction';

      await cognitoResourceManager.handler(event, mockContext);

      // Should send FAILED response
      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0];
      expect(callArgs[0].method).toBe('PUT');
      
      // Check that response body contains error status
      const writeCall = mockRequest.write.mock.calls[0];
      const responseBody = JSON.parse(writeCall[0]);
      expect(responseBody.Status).toBe('FAILED');
      expect(responseBody.Data.Error).toContain('Unknown action');
    });
  });

  describe('Response handling', () => {
    test('should send SUCCESS response with correct physical resource ID', async () => {
      const event = createMockEvent('Create');
      
      mockCognitoIdpPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' })
        .mockResolvedValueOnce({ IdentityProvider: { ProviderName: 'Google' } });

      await cognitoResourceManager.handler(event, mockContext);

      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0];
      expect(callArgs[0].method).toBe('PUT');
      
      // Check that response body contains success status and correct data
      const writeCall = mockRequest.write.mock.calls[0];
      const responseBody = JSON.parse(writeCall[0]);
      expect(responseBody.Status).toBe('SUCCESS');
      expect(responseBody.Data.ProviderName).toBe('Google');
      expect(responseBody.PhysicalResourceId).toBe('us-east-1_EXAMPLE-Google');
    });
  });
});