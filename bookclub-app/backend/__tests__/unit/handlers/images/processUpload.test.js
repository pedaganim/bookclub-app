const { handler } = require('../../../../src/handlers/images/processUpload');
const textractService = require('../../../../src/lib/textract-service');
const { DynamoDB } = require('../../../../src/lib/aws-config');
const { getTableName } = require('../../../../src/lib/table-names');

// Mock the dependencies
jest.mock('../../../../src/lib/textract-service');
jest.mock('../../../../src/lib/aws-config');
jest.mock('../../../../src/lib/table-names');

describe('processUpload handler', () => {
  let mockDynamoClient;
  let mockPut;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DynamoDB DocumentClient
    mockPut = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    mockDynamoClient = {
      put: mockPut
    };
    
    DynamoDB.DocumentClient = jest.fn().mockImplementation(() => mockDynamoClient);
    
    // Mock getTableName function
    getTableName.mockImplementation((key) => {
      const tableNames = {
        'metadata-cache': 'bookclub-app-metadata-cache-dev'
      };
      return tableNames[key];
    });
    
    // Mock textract service
    textractService.extractTextFromImage.mockResolvedValue({
      bookMetadata: {
        title: 'Test Book',
        author: 'Test Author',
        isbn: '1234567890'
      },
      extractedText: 'Sample extracted text',
      confidence: 85
    });
  });

  it('should use correct table name when storing metadata', async () => {
    const event = {
      Records: [
        {
          eventSource: 'aws:s3',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'book-covers/user123/test-image.jpg' }
          }
        }
      ]
    };

    await handler(event);

    // Verify that getTableName was called with the correct key
    expect(getTableName).toHaveBeenCalledWith('metadata-cache');
    
    // Verify that DynamoDB put was called with the correct table name
    expect(mockPut).toHaveBeenCalledWith({
      TableName: 'bookclub-app-metadata-cache-dev',
      Item: expect.objectContaining({
        cacheKey: 'textract:test-bucket:book-covers/user123/test-image.jpg',
        userId: 'user123',
        s3Bucket: 'test-bucket',
        s3Key: 'book-covers/user123/test-image.jpg',
        metadata: expect.objectContaining({
          title: 'Test Book',
          author: 'Test Author',
          isbn: '1234567890'
        }),
        extractedText: 'Sample extracted text',
        confidence: 85
      })
    });
  });

  it('should handle non-S3 events gracefully', async () => {
    const event = {
      Records: [
        {
          eventSource: 'aws:sqs' // Non-S3 event
        }
      ]
    };

    const result = await handler(event);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processed 1 image(s)'
      })
    });
    
    // Should not call DynamoDB
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle non-book-cover images gracefully', async () => {
    const event = {
      Records: [
        {
          eventSource: 'aws:s3',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'other-images/user123/test-image.jpg' }
          }
        }
      ]
    };

    const result = await handler(event);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processed 1 image(s)'
      })
    });
    
    // Should not call DynamoDB
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle textract extraction failure gracefully', async () => {
    textractService.extractTextFromImage.mockResolvedValue(null);

    const event = {
      Records: [
        {
          eventSource: 'aws:s3',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'book-covers/user123/test-image.jpg' }
          }
        }
      ]
    };

    const result = await handler(event);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processed 1 image(s)'
      })
    });
    
    // Should not call DynamoDB when extraction fails
    expect(mockPut).not.toHaveBeenCalled();
  });
});