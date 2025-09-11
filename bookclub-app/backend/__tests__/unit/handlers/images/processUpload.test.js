const { handler } = require('../../../../src/handlers/images/processUpload');
const Book = require('../../../../src/models/book');
const textractService = require('../../../../src/lib/textract-service');
const { DynamoDB } = require('../../../../src/lib/aws-config');

// Mock the dependencies
jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/textract-service');
jest.mock('../../../../src/lib/aws-config');

describe('processUpload handler', () => {
  let mockDynamoDBPut;
  let mockDocumentClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Book model
    Book.create = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      title: 'Uploaded Book',
      author: 'Unknown Author',
      userId: 'user123'
    });

    Book.update = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      title: 'Updated Book',
      author: 'Sample Author',
      userId: 'user123'
    });

    // Mock textract service
    textractService.extractTextFromImage = jest.fn().mockResolvedValue({
      extractedText: {
        fullText: 'Sample Book Title by Sample Author',
        lines: [],
        words: [],
        blocks: 0
      },
      bookMetadata: {
        title: 'Sample Book Title',
        author: 'Sample Author',
        description: 'Sample description',
        extractionSource: 'textract'
      },
      confidence: 85
    });

    // Mock DynamoDB
    mockDynamoDBPut = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    mockDocumentClient = {
      put: mockDynamoDBPut
    };
    
    DynamoDB.DocumentClient = jest.fn().mockImplementation(() => mockDocumentClient);
  });

  it('should create book entry and extract metadata for uploaded image', async () => {
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

    // Should create book with minimal data first
    expect(Book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Image', // Derived from filename
        author: 'Unknown Author',
        description: 'Book uploaded via image - metadata processing in progress',
        coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user123/test-image.jpg',
        metadataSource: 'image-upload-pending'
      }),
      'user123'
    );

    // Should extract metadata
    expect(textractService.extractTextFromImage).toHaveBeenCalledWith('test-bucket', 'book-covers/user123/test-image.jpg');

    // Should update book with extracted metadata
    expect(Book.update).toHaveBeenCalledWith(
      'test-book-id',
      'user123',
      expect.objectContaining({
        title: 'Sample Book Title',
        author: 'Sample Author',
        description: 'Sample description',
        metadataSource: 'textract-auto-processed'
      })
    );

    // Should cache metadata
    expect(mockDynamoDBPut).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'bookclub-app-metadata-cache-dev',
        Item: expect.objectContaining({
          cacheKey: 'textract:test-bucket:book-covers/user123/test-image.jpg',
          userId: 'user123',
          confidence: 85
        })
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
      body: JSON.stringify({
        message: 'Processed 1 image(s)'
      })
    });
    
    // Should not create book for non-S3 events
    expect(Book.create).not.toHaveBeenCalled();
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
    
    // Should not create book for non-book-cover images
    expect(Book.create).not.toHaveBeenCalled();
  });

  it('should handle metadata extraction failure gracefully', async () => {
    // Mock textract service to fail
    textractService.extractTextFromImage.mockRejectedValue(new Error('Textract failed'));

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

    // Should create book
    expect(Book.create).toHaveBeenCalled();
    
    // Should attempt metadata extraction
    expect(textractService.extractTextFromImage).toHaveBeenCalled();
    
    // Should not update book if metadata extraction fails
    expect(Book.update).not.toHaveBeenCalled();
    
    // Should not cache metadata if extraction fails
    expect(mockDynamoDBPut).not.toHaveBeenCalled();
  });

  it('should handle book creation failure gracefully', async () => {
    // Mock Book.create to fail
    Book.create.mockRejectedValue(new Error('Book creation failed'));

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
      body: JSON.stringify({
        message: 'Processed 1 image(s)'
      })
    });

    // Should attempt to create book
    expect(Book.create).toHaveBeenCalled();

    // Should not extract metadata or update book if creation fails
    expect(textractService.extractTextFromImage).not.toHaveBeenCalled();
    expect(Book.update).not.toHaveBeenCalled();
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
    expect(Book.create).toHaveBeenCalledTimes(2);
    expect(Book.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user123/test-image1.jpg'
    }), 'user123');
    expect(Book.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user456/test-image2.jpg'
    }), 'user456');
    
    // Should extract metadata for both images
    expect(textractService.extractTextFromImage).toHaveBeenCalledTimes(2);
    
    // Should update both books
    expect(Book.update).toHaveBeenCalledTimes(2);
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

      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: testCase.expected
        }),
        'user123'
      );

      jest.clearAllMocks();
    }
  });
});