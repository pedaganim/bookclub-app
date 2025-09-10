// Mock all dependencies before importing the service
jest.mock('../../../src/lib/aws-config');
jest.mock('../../../src/lib/table-names');

const mockDynamoClient = {
  get: jest.fn(),
  scan: jest.fn(),
  delete: jest.fn(),
};

// Mock the AWS config module
require('../../../src/lib/aws-config').DynamoDB = {
  DocumentClient: jest.fn(() => mockDynamoClient),
};

// Mock table names
require('../../../src/lib/table-names').metadataCache = 'test-metadata-cache-table';

// Now import the service after mocking
const imageMetadataService = require('../../../src/lib/image-metadata-service');

describe('Image Metadata Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('getExtractedMetadata', () => {
    it('should retrieve pre-extracted metadata successfully', async () => {
      const mockItem = {
        extractedText: { fullText: 'Sample text' },
        metadata: {
          title: 'Sample Book',
          author: 'John Doe',
          isbn: '123456789',
        },
        confidence: 95,
        extractedAt: '2023-01-01T00:00:00Z',
      };

      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: mockItem }),
      });

      const result = await imageMetadataService.getExtractedMetadata('test-bucket', 'test-key');

      expect(result).toEqual({
        extractedText: mockItem.extractedText,
        bookMetadata: mockItem.metadata,
        confidence: mockItem.confidence,
        extractedAt: mockItem.extractedAt,
        isPreExtracted: true,
      });

      expect(mockDynamoClient.get).toHaveBeenCalledWith({
        TableName: 'test-metadata-cache-table',
        Key: { cacheKey: 'textract:test-bucket:test-key' },
      });
    });

    it('should return null when no metadata found', async () => {
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const result = await imageMetadataService.getExtractedMetadata('test-bucket', 'test-key');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error')),
      });

      const result = await imageMetadataService.getExtractedMetadata('test-bucket', 'test-key');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving pre-extracted metadata'),
        expect.any(Error)
      );
    });
  });

  describe('getUserExtractedMetadata', () => {
    it('should retrieve all metadata for a user', async () => {
      const mockItems = [
        {
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user123/image1.jpg',
          extractedAt: '2023-01-01T00:00:00Z',
          metadata: { title: 'Book 1' },
          confidence: 95,
          extractedText: { fullText: 'Text 1' },
        },
        {
          s3Bucket: 'test-bucket',
          s3Key: 'book-covers/user123/image2.jpg',
          extractedAt: '2023-01-02T00:00:00Z',
          metadata: { title: 'Book 2' },
          confidence: 90,
          extractedText: { fullText: 'Text 2' },
        },
      ];

      mockDynamoClient.scan.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: mockItems }),
      });

      const result = await imageMetadataService.getUserExtractedMetadata('user123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        s3Bucket: 'test-bucket',
        s3Key: 'book-covers/user123/image1.jpg',
        extractedAt: '2023-01-01T00:00:00Z',
        metadata: { title: 'Book 1' },
        confidence: 95,
        extractedText: { fullText: 'Text 1' },
      });
    });

    it('should return empty array on error', async () => {
      mockDynamoClient.scan.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Scan error')),
      });

      const result = await imageMetadataService.getUserExtractedMetadata('user123');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving user metadata'),
        expect.any(Error)
      );
    });
  });

  describe('deleteExtractedMetadata', () => {
    it('should delete metadata successfully', async () => {
      mockDynamoClient.delete.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const result = await imageMetadataService.deleteExtractedMetadata('test-bucket', 'test-key');

      expect(result).toBe(true);
      expect(mockDynamoClient.delete).toHaveBeenCalledWith({
        TableName: 'test-metadata-cache-table',
        Key: { cacheKey: 'textract:test-bucket:test-key' },
      });
    });

    it('should handle delete errors gracefully', async () => {
      mockDynamoClient.delete.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Delete error')),
      });

      const result = await imageMetadataService.deleteExtractedMetadata('test-bucket', 'test-key');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting extracted metadata'),
        expect.any(Error)
      );
    });
  });
});