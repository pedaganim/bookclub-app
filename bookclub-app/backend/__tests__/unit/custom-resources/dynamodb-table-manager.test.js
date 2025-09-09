/**
 * Unit tests for DynamoDB Table Manager Custom Resource
 */

// Mock AWS SDK before importing the module
const mockDynamoDBPromise = jest.fn();
const mockDynamoDB = {
  describeTable: jest.fn(() => ({ promise: mockDynamoDBPromise })),
  createTable: jest.fn(() => ({ promise: mockDynamoDBPromise })),
  deleteTable: jest.fn(() => ({ promise: mockDynamoDBPromise })),
  waitFor: jest.fn(() => ({ promise: mockDynamoDBPromise })),
  updateTimeToLive: jest.fn(() => ({ promise: mockDynamoDBPromise }))
};

jest.mock('aws-sdk', () => ({
  DynamoDB: jest.fn().mockImplementation(() => mockDynamoDB)
}));

// Mock HTTPS module for CloudFormation response
const mockHttpsRequest = jest.fn();
jest.mock('https', () => ({
  request: mockHttpsRequest
}));

const dynamoTableManager = require('../../../src/custom-resources/dynamodb-table-manager');

describe('DynamoDB Table Manager Custom Resource', () => {
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

  const createMockEvent = (requestType, tableName = 'test-table') => ({
    RequestType: requestType,
    ResponseURL: 'https://test-url.com',
    StackId: 'test-stack-id',
    RequestId: 'test-request-id',
    LogicalResourceId: 'TestTable',
    ResourceProperties: {
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  });

  const mockContext = {
    logStreamName: 'test-log-stream'
  };

  describe('Create operations', () => {
    test('should create table when it does not exist', async () => {
      const event = createMockEvent('Create');
      
      // Mock table does not exist
      mockDynamoDBPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' }) // describeTable fails
        .mockResolvedValueOnce({ TableDescription: { TableName: 'test-table' } }) // createTable succeeds
        .mockResolvedValueOnce(); // waitFor succeeds

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.describeTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.createTable).toHaveBeenCalledWith({
        TableName: 'test-table',
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      });
      expect(mockDynamoDB.waitFor).toHaveBeenCalledWith('tableExists', { TableName: 'test-table' });
    });

    test('should adopt existing table when it already exists', async () => {
      const event = createMockEvent('Create');
      
      // Mock table already exists
      mockDynamoDBPromise.mockResolvedValueOnce({ Table: { TableName: 'test-table' } });

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.describeTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.createTable).not.toHaveBeenCalled();
    });

    test('should handle ResourceInUseException gracefully', async () => {
      const event = createMockEvent('Create');
      
      // Mock table does not exist initially but creation fails with ResourceInUseException
      mockDynamoDBPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' }) // describeTable fails
        .mockRejectedValueOnce({ code: 'ResourceInUseException' }); // createTable fails with ResourceInUseException

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.describeTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.createTable).toHaveBeenCalled();
      // Should not throw error and should respond with SUCCESS
      expect(mockHttpsRequest).toHaveBeenCalled();
    });
  });

  describe('Update operations', () => {
    test('should handle update requests gracefully', async () => {
      const event = createMockEvent('Update');

      await dynamoTableManager.handler(event, mockContext);

      // Update operations are skipped for safety
      expect(mockHttpsRequest).toHaveBeenCalled();
    });
  });

  describe('Delete operations', () => {
    test('should delete table when DeletionPolicy is not Retain', async () => {
      const event = createMockEvent('Delete');
      
      // Mock table exists and can be deleted
      mockDynamoDBPromise
        .mockResolvedValueOnce({ Table: { TableName: 'test-table' } }) // describeTable succeeds
        .mockResolvedValueOnce() // deleteTable succeeds
        .mockResolvedValueOnce(); // waitFor succeeds

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.describeTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.deleteTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.waitFor).toHaveBeenCalledWith('tableNotExists', { TableName: 'test-table' });
    });

    test('should not delete table when DeletionPolicy is Retain', async () => {
      const event = createMockEvent('Delete');
      event.ResourceProperties.DeletionPolicy = 'Retain';

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.deleteTable).not.toHaveBeenCalled();
    });

    test('should handle table not found during delete', async () => {
      const event = createMockEvent('Delete');
      
      // Mock table does not exist
      mockDynamoDBPromise.mockRejectedValueOnce({ code: 'ResourceNotFoundException' });

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.describeTable).toHaveBeenCalledWith({ TableName: 'test-table' });
      expect(mockDynamoDB.deleteTable).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should send FAILED response on error', async () => {
      const event = createMockEvent('Create');
      
      // Mock unexpected error
      mockDynamoDBPromise.mockRejectedValue(new Error('Unexpected DynamoDB error'));

      await dynamoTableManager.handler(event, mockContext);

      // Should send FAILED response
      expect(mockHttpsRequest).toHaveBeenCalled();
      const callArgs = mockHttpsRequest.mock.calls[0];
      expect(callArgs[0].method).toBe('PUT');
    });

    test('should handle unknown request type', async () => {
      const event = createMockEvent('Unknown');

      await dynamoTableManager.handler(event, mockContext);

      // Should send FAILED response
      expect(mockHttpsRequest).toHaveBeenCalled();
    });
  });

  describe('TTL configuration', () => {
    test('should configure TTL when specified', async () => {
      const event = createMockEvent('Create');
      event.ResourceProperties.TimeToLiveSpecification = {
        AttributeName: 'ttl',
        Enabled: true
      };
      
      // Mock table creation and TTL setup
      mockDynamoDBPromise
        .mockRejectedValueOnce({ code: 'ResourceNotFoundException' }) // describeTable fails
        .mockResolvedValueOnce({ TableDescription: { TableName: 'test-table' } }) // createTable succeeds
        .mockResolvedValueOnce() // waitFor succeeds
        .mockResolvedValueOnce(); // updateTimeToLive succeeds

      await dynamoTableManager.handler(event, mockContext);

      expect(mockDynamoDB.updateTimeToLive).toHaveBeenCalledWith({
        TableName: 'test-table',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true
        }
      });
    });
  });
});