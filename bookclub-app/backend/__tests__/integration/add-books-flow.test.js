const { handler: processUploadHandler } = require('../../src/handlers/images/processUpload');
const { handler: createBookHandler } = require('../../src/handlers/books/create');
const Book = require('../../src/models/book');
const textractService = require('../../src/lib/textract-service');
const { DynamoDB } = require('../../src/lib/aws-config');
const { getTableName } = require('../../src/lib/table-names');

// Mock AWS services for integration test
jest.mock('../../src/lib/aws-config');
jest.mock('../../src/lib/textract-service');

describe('Add Books Flow - End-to-End Integration', () => {
  let mockDynamoDBPut, mockDynamoDBUpdate, mockDocumentClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DynamoDB operations
    mockDynamoDBPut = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    mockDynamoDBUpdate = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Attributes: {
          bookId: 'test-book-id',
          title: 'Extracted Book Title',
          author: 'Extracted Author',
          metadataSource: 'textract-auto-processed'
        }
      })
    });
    
    mockDocumentClient = {
      put: mockDynamoDBPut,
      update: mockDynamoDBUpdate
    };
    
    DynamoDB.DocumentClient = jest.fn().mockImplementation(() => mockDocumentClient);

    // Mock Textract service with realistic extraction result
    textractService.extractTextFromImage = jest.fn().mockResolvedValue({
      extractedText: {
        fullText: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin',
        lines: [
          { text: 'Clean Code', confidence: 95 },
          { text: 'A Handbook of Agile Software Craftsmanship', confidence: 90 },
          { text: 'by Robert C. Martin', confidence: 92 }
        ],
        words: [],
        blocks: 15
      },
      bookMetadata: {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        description: 'A Handbook of Agile Software Craftsmanship',
        isbn: '9780132350884',
        extractionSource: 'textract'
      },
      confidence: 93
    });

    // Mock Book model to use in-memory storage for testing
    Book.create = jest.fn().mockImplementation(async (bookData, userId) => ({
      bookId: 'test-book-id',
      userId,
      ...bookData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    Book.update = jest.fn().mockImplementation(async (bookId, userId, updates) => ({
      bookId,
      userId,
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  });

  describe('Complete Add Books Flow', () => {
    it('should create book, extract metadata, cache results, and update book', async () => {
      // Simulate S3 event when user uploads book cover image
      const s3Event = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'book-covers/user123/clean-code.jpg' }
            }
          }
        ]
      };

      // Execute the S3 trigger handler (this is the main flow)
      const result = await processUploadHandler(s3Event);

      // Verify successful response
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Processed 1 image(s)'
        })
      });

      // Verify book was created with placeholder data
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Clean Code',
          author: 'Unknown Author',
          description: 'Book uploaded via image - metadata processing in progress',
          coverImage: 'https://test-bucket.s3.amazonaws.com/book-covers/user123/clean-code.jpg',
          metadataSource: 'image-upload-pending'
        }),
        'user123'
      );

      // Verify metadata extraction was triggered
      expect(textractService.extractTextFromImage).toHaveBeenCalledWith(
        'test-bucket',
        'book-covers/user123/clean-code.jpg'
      );

      // Verify metadata was cached in DynamoDB
      expect(mockDynamoDBPut).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: getTableName('metadata-cache'),
          Item: expect.objectContaining({
            cacheKey: 'textract:test-bucket:book-covers/user123/clean-code.jpg',
            userId: 'user123',
            metadata: expect.objectContaining({
              title: 'Clean Code',
              author: 'Robert C. Martin',
              isbn: '9780132350884'
            }),
            confidence: 93
          })
        })
      );

      // Verify book was updated with extracted metadata
      expect(Book.update).toHaveBeenCalledWith(
        'test-book-id',
        'user123',
        expect.objectContaining({
          title: 'Clean Code',
          author: 'Robert C. Martin',
          description: 'A Handbook of Agile Software Craftsmanship',
          isbn13: '9780132350884',
          metadataSource: 'textract-auto-processed',
          textractExtractedText: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin',
          textractConfidence: 93
        })
      );
    });

    it('should handle metadata extraction failure gracefully', async () => {
      // Mock Textract failure
      textractService.extractTextFromImage.mockRejectedValue(new Error('Textract service unavailable'));

      const s3Event = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'book-covers/user123/test-book.jpg' }
            }
          }
        ]
      };

      // Execute the S3 trigger handler
      const result = await processUploadHandler(s3Event);

      // Verify successful response despite metadata extraction failure
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Processed 1 image(s)'
        })
      });

      // Verify book was still created with placeholder data
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Book',
          author: 'Unknown Author',
          metadataSource: 'image-upload-pending'
        }),
        'user123'
      );

      // Verify metadata extraction was attempted
      expect(textractService.extractTextFromImage).toHaveBeenCalled();

      // Verify no metadata caching occurred
      expect(mockDynamoDBPut).not.toHaveBeenCalled();

      // Verify book was not updated (remains with placeholder data)
      expect(Book.update).not.toHaveBeenCalled();
    });

    it('should process multiple books in parallel', async () => {
      const s3Event = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'book-covers/user123/book1.jpg' }
            }
          },
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'book-covers/user456/book2.jpg' }
            }
          }
        ]
      };

      // Execute the S3 trigger handler
      const result = await processUploadHandler(s3Event);

      // Verify successful response
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Processed 2 image(s)'
        })
      });

      // Verify both books were created
      expect(Book.create).toHaveBeenCalledTimes(2);
      expect(Book.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
        title: 'Book1'
      }), 'user123');
      expect(Book.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
        title: 'Book2'
      }), 'user456');

      // Verify metadata extraction was called for both books
      expect(textractService.extractTextFromImage).toHaveBeenCalledTimes(2);

      // Verify both books were updated
      expect(Book.update).toHaveBeenCalledTimes(2);
    });

    it('should skip non-book-cover images', async () => {
      const s3Event = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'other-images/user123/profile.jpg' }
            }
          }
        ]
      };

      // Execute the S3 trigger handler
      const result = await processUploadHandler(s3Event);

      // Verify successful response
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Processed 1 image(s)'
        })
      });

      // Verify no book was created for non-book-cover image
      expect(Book.create).not.toHaveBeenCalled();
      expect(textractService.extractTextFromImage).not.toHaveBeenCalled();
    });
  });

  describe('Manual Book Creation with Pre-Extracted Metadata', () => {
    it('should use cached metadata when creating book manually', async () => {
      // This test simulates a user manually creating a book after the S3 trigger
      // has already processed the image and cached the metadata

      // Mock the image metadata service to return cached data
      const imageMetadataService = require('../../src/lib/image-metadata-service');
      imageMetadataService.getExtractedMetadata = jest.fn().mockResolvedValue({
        extractedText: {
          fullText: 'Design Patterns by Gang of Four'
        },
        bookMetadata: {
          title: 'Design Patterns',
          author: 'Gang of Four',
          description: 'Elements of Reusable Object-Oriented Software',
          extractionSource: 'textract'
        },
        confidence: 89,
        isPreExtracted: true
      });

      // Mock create book request with image extraction flag
      const createBookEvent = {
        requestContext: {
          authorizer: {
            claims: { sub: 'user123' }
          }
        },
        body: JSON.stringify({
          extractFromImage: true,
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user123/design-patterns.jpg'
        })
      };

      const result = await createBookHandler(createBookEvent);

      // Verify successful response
      expect(result.statusCode).toBe(201);
      
      const responseData = JSON.parse(result.body);
      expect(responseData.success).toBe(true);

      // Verify book was created with pre-extracted metadata
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Design Patterns',
          author: 'Gang of Four',
          description: 'Elements of Reusable Object-Oriented Software',
          isPreExtracted: true
        }),
        'user123'
      );

      // Verify cached metadata was used (no new Textract call)
      expect(textractService.extractTextFromImage).not.toHaveBeenCalled();
    });
  });
});