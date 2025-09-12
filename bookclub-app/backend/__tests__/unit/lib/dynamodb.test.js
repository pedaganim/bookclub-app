// Mock AWS SDK before requiring the module
const mockDeleteMethod = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

const mockGetMethod = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({ Item: null })
});

const mockPutMethod = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

jest.mock('../../../src/lib/aws-config', () => ({
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      delete: mockDeleteMethod,
      get: mockGetMethod,
      put: mockPutMethod,
      query: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] })
      }),
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] })
      }),
      update: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: {} })
      })
    }))
  }
}));

const dynamoDb = require('../../../src/lib/dynamodb');

describe('DynamoDB module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('delete method', () => {
    it('should work with legacy signature: delete(tableName, key)', async () => {
      const tableName = 'test-table';
      const key = { id: 'test-id' };

      const result = await dynamoDb.delete(tableName, key);

      expect(mockDeleteMethod).toHaveBeenCalledWith({
        TableName: tableName,
        Key: key
      });
      expect(result).toEqual({ success: true });
    });

    it('should work with new signature: delete(params) for conditional deletes', async () => {
      const params = {
        TableName: 'test-table',
        Key: { id: 'test-id' },
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': 'user123'
        }
      };

      const result = await dynamoDb.delete(params);

      expect(mockDeleteMethod).toHaveBeenCalledWith(params);
      expect(result).toEqual({ success: true });
    });

    it('should handle AWS SDK errors properly', async () => {
      const error = new Error('AWS Error');
      mockDeleteMethod.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(error)
      });

      await expect(dynamoDb.delete('test-table', { id: 'test' }))
        .rejects.toThrow('AWS Error');
    });
  });

  describe('backward compatibility', () => {
    it('should maintain existing behavior for other methods', async () => {
      // Test that other methods still work as expected
      await dynamoDb.get('test-table', { id: 'test' });
      expect(mockGetMethod).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: { id: 'test' }
      });

      await dynamoDb.put('test-table', { id: 'test', data: 'value' });
      expect(mockPutMethod).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: { id: 'test', data: 'value' }
      });
    });
  });
});