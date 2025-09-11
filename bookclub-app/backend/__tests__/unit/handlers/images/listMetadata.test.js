const { handler } = require('../../../../src/handlers/images/listMetadata');
const response = require('../../../../src/lib/response');
const imageMetadataService = require('../../../../src/lib/image-metadata-service');

// Mock dependencies
jest.mock('../../../../src/lib/image-metadata-service');

describe('listMetadata handler', () => {
  const mockUserId = 'test-user-123';
  const mockEvent = {
    requestContext: {
      authorizer: {
        claims: {
          sub: mockUserId,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return unauthorized when no user ID is provided', async () => {
      const eventWithoutAuth = {
        requestContext: {
          authorizer: {
            claims: {},
          },
        },
      };

      const result = await handler(eventWithoutAuth);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).success).toBe(false);
      expect(JSON.parse(result.body).error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('specific image metadata retrieval', () => {
    it('should return specific metadata when s3Bucket and s3Key are provided', async () => {
      const s3Bucket = 'test-bucket';
      const s3Key = 'book-covers/user/test-image.jpg';
      const mockMetadata = {
        extractedText: { fullText: 'Sample book text' },
        bookMetadata: {
          title: 'Test Book',
          author: 'Test Author',
          isbn: '1234567890',
        },
        confidence: 85,
        extractedAt: '2025-01-01T00:00:00Z',
        isPreExtracted: true,
      };

      const eventWithQuery = {
        ...mockEvent,
        queryStringParameters: {
          s3Bucket,
          s3Key,
        },
      };

      imageMetadataService.getExtractedMetadata.mockResolvedValueOnce(mockMetadata);

      const result = await handler(eventWithQuery);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      expect(JSON.parse(result.body).data).toEqual(mockMetadata);
      expect(imageMetadataService.getExtractedMetadata).toHaveBeenCalledWith(s3Bucket, s3Key);
    });

    it('should return not found when no pre-extracted metadata exists', async () => {
      const s3Bucket = 'test-bucket';
      const s3Key = 'book-covers/user/test-image.jpg';

      const eventWithQuery = {
        ...mockEvent,
        queryStringParameters: {
          s3Bucket,
          s3Key,
        },
      };

      imageMetadataService.getExtractedMetadata.mockResolvedValueOnce(null);

      const result = await handler(eventWithQuery);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).success).toBe(false);
      expect(JSON.parse(result.body).error.code).toBe('NOT_FOUND');
      expect(JSON.parse(result.body).error.message).toBe('No pre-extracted metadata found for this image');
    });

    it('should handle only s3Bucket provided (should still list all)', async () => {
      const mockMetadataList = [
        {
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user/book1.jpg',
          metadata: { title: 'Book 1', author: 'Author 1' },
          confidence: 90,
        },
      ];

      const eventWithPartialQuery = {
        ...mockEvent,
        queryStringParameters: {
          s3Bucket: 'test-bucket',
          // s3Key missing
        },
      };

      imageMetadataService.getUserExtractedMetadata.mockResolvedValueOnce(mockMetadataList);

      const result = await handler(eventWithPartialQuery);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      expect(JSON.parse(result.body).data.items).toEqual(mockMetadataList);
      expect(imageMetadataService.getUserExtractedMetadata).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('list all user metadata', () => {
    it('should return all user metadata when no query parameters provided', async () => {
      const mockMetadataList = [
        {
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user/book1.jpg',
          metadata: { title: 'Book 1', author: 'Author 1', isbn: '123' },
          confidence: 90,
        },
        {
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user/book2.jpg',
          metadata: { title: 'Book 2', author: 'Author 2' },
          confidence: 85,
        },
      ];

      const eventWithoutQuery = {
        ...mockEvent,
        queryStringParameters: null,
      };

      imageMetadataService.getUserExtractedMetadata.mockResolvedValueOnce(mockMetadataList);

      const result = await handler(eventWithoutQuery);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      
      const responseData = JSON.parse(result.body).data;
      expect(responseData.items).toEqual(mockMetadataList);
      expect(responseData.count).toBe(2);
      expect(responseData.summary.totalImages).toBe(2);
      expect(responseData.summary.withTitle).toBe(2);
      expect(responseData.summary.withAuthor).toBe(2);
      expect(responseData.summary.withISBN).toBe(1);
      expect(responseData.summary.averageConfidence).toBe(88); // (90 + 85) / 2 = 87.5, rounded = 88
    });

    it('should return empty summary when no metadata exists', async () => {
      const eventWithoutQuery = {
        ...mockEvent,
        queryStringParameters: {},
      };

      imageMetadataService.getUserExtractedMetadata.mockResolvedValueOnce([]);

      const result = await handler(eventWithoutQuery);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).success).toBe(true);
      
      const responseData = JSON.parse(result.body).data;
      expect(responseData.items).toEqual([]);
      expect(responseData.count).toBe(0);
      expect(responseData.summary.totalImages).toBe(0);
      expect(responseData.summary.averageConfidence).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors from imageMetadataService', async () => {
      const eventWithQuery = {
        ...mockEvent,
        queryStringParameters: {
          s3Bucket: 'test-bucket',
          s3Key: 'test-key',
        },
      };

      const mockError = new Error('Database connection failed');
      imageMetadataService.getExtractedMetadata.mockRejectedValueOnce(mockError);

      const result = await handler(eventWithQuery);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
    });

    it('should handle errors from getUserExtractedMetadata', async () => {
      const eventWithoutQuery = {
        ...mockEvent,
        queryStringParameters: {},
      };

      const mockError = new Error('Database connection failed');
      imageMetadataService.getUserExtractedMetadata.mockRejectedValueOnce(mockError);

      const result = await handler(eventWithoutQuery);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
    });
  });
});