// Mock the dependencies FIRST
jest.mock('../../../../src/services/book-service');
jest.mock('../../../../src/lib/event-bus', () => ({
  publishEvent: jest.fn().mockResolvedValue({}),
}));
jest.mock('aws-sdk', () => {
  const mSQS = {
    sendMessage: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({}),
  };
  const mDocumentClient = {
    put: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({}),
  };
  return {
    SQS: jest.fn(() => mSQS),
    Textract: jest.fn(() => ({})),
    DynamoDB: {
      DocumentClient: jest.fn(() => mDocumentClient),
    },
    config: {
      update: jest.fn(),
    },
  };
});
jest.mock('../../../../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const { handler } = require('../../../../src/handlers/images/processUpload');
const BookService = require('../../../../src/services/book-service');
const AWS = require('aws-sdk');
const config = require('../../../../src/lib/config');

describe('processUpload handler', () => {
  let sqs;

  beforeAll(() => {
    config.BEDROCK_ANALYZE_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/bedrock-analyze-queue';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sqs = new AWS.SQS();
    
    // Mock BookService
    BookService.create.mockResolvedValue({
      bookId: 'test-book-id',
      title: 'Uploaded Book',
      author: 'Unknown Author',
      userId: 'user123'
    });
  });

  it('should create book entry and enqueue SQS message for uploaded image', async () => {
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
      body: 'OK'
    });

    // Should create book with minimal data first
    expect(BookService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Image', // Derived from filename
        status: 'available',
        coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user123/test-image.jpg',
        extractFromImage: false
      }),
      'user123'
    );

    // Should send SQS message
    expect(sqs.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        MessageBody: expect.stringContaining('"bookId":"test-book-id"'),
      })
    );
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
      body: 'OK'
    });
    
    // Should not create book for non-S3 events
    expect(BookService.create).not.toHaveBeenCalled();
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
      body: 'OK'
    });
    
    // Should not create book for non-book-cover images
    expect(BookService.create).not.toHaveBeenCalled();
  });

  it('should handle book creation failure gracefully', async () => {
    // Mock BookService.create to fail
    BookService.create.mockRejectedValue(new Error('Book creation failed'));

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

    // Should not throw error, but continue processing
    const result = await handler(event);

    expect(result).toEqual({
      statusCode: 200,
      body: 'OK'
    });

    // Should attempt to create book
    expect(BookService.create).toHaveBeenCalled();
  });

  it('should process multiple images in batch', async () => {
    const event = {
      Records: [
        {
          eventSource: 'aws:s3',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'book-covers/user123/test-image1.jpg' }
          }
        },
        {
          eventSource: 'aws:s3',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'book-covers/user456/test-image2.jpg' }
          }
        }
      ]
    };

    await handler(event);

    // Should create books for both images
    expect(BookService.create).toHaveBeenCalledTimes(2);
    expect(BookService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user123/test-image1.jpg'
    }), 'user123');
    expect(BookService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user456/test-image2.jpg'
    }), 'user456');
    
    // Should send SQS messages for both images
    expect(sqs.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('should derive meaningful titles from various filename formats', async () => {
    const testCases = [
      { filename: 'my-book-title.jpg', expected: 'My Book Title' },
      { filename: 'book_with_underscores.png', expected: 'Book With Underscores' },
      { filename: 'book.title.with.dots.gif', expected: 'Book Title With Dots' },
      { filename: 'MixedCaseTitle.jpg', expected: 'MixedCaseTitle' },
      { filename: 'simple.jpg', expected: 'Simple' }
    ];

    for (const testCase of testCases) {
      const event = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: `book-covers/user123/${testCase.filename}` }
            }
          }
        ]
      };

      await handler(event);

      expect(BookService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: testCase.expected
        }),
        'user123'
      );

      jest.clearAllMocks();
    }
  });
});