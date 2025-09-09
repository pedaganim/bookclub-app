// Mock AWS SDK
jest.mock('../../../src/lib/aws-config', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getSignedUrlPromise: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/presigned-upload-url')
  }))
}));

describe('generateUploadUrl handler', () => {
  let handler;
  const originalEnv = process.env;

  beforeAll(() => {
    // Set environment variable before requiring the module
    process.env.BOOK_COVERS_BUCKET = 'test-book-covers-bucket';
    
    // Clear module cache and require the handler
    delete require.cache[require.resolve('../../../src/handlers/files/generateUploadUrl')];
    handler = require('../../../src/handlers/files/generateUploadUrl').handler;
  });

  afterAll(() => {
    process.env = originalEnv;
  });
  const mockEvent = {
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id'
        }
      }
    },
    body: JSON.stringify({
      fileType: 'image/jpeg',
      fileName: 'test-cover.jpg'
    })
  };

  test('should generate upload URL and file URL for valid image', async () => {
    const result = await handler(mockEvent);
    
    expect(result.statusCode).toBe(200);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('uploadUrl');
    expect(body.data).toHaveProperty('fileUrl');
    expect(body.data).toHaveProperty('fileKey');
    expect(body.data).toHaveProperty('maxFileSize');
    expect(body.data).toHaveProperty('recommendations');
    
    // Verify file URL format for public access
    expect(body.data.fileUrl).toMatch(/^https:\/\/test-book-covers-bucket\.s3\.amazonaws\.com\/book-covers\/test-user-id\/.*\.jpeg$/);
    
    // Verify file key includes user ID and is in book-covers directory
    expect(body.data.fileKey).toMatch(/^book-covers\/test-user-id\/.*\.jpeg$/);
    
    // Verify cost optimization features
    expect(body.data.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    expect(body.data.recommendations).toHaveProperty('optimalSize');
    expect(body.data.recommendations).toHaveProperty('acceptedFormats');
  });

  test('should reject invalid file types', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileType: 'text/plain',
        fileName: 'test.txt'
      })
    };

    const result = await handler(invalidEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.errors.fileType).toContain('Invalid file type');
  });

  test('should reject missing file type', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileName: 'test.jpg'
      })
    };

    const result = await handler(invalidEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.errors.fileType).toContain('File type is required');
  });

  test('should accept all valid image types', async () => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    for (const fileType of validTypes) {
      const testEvent = {
        ...mockEvent,
        body: JSON.stringify({
          fileType,
          fileName: `test.${fileType.split('/')[1]}`
        })
      };

      const result = await handler(testEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      
      // Verify the file extension matches the MIME type
      const expectedExtension = fileType.split('/')[1];
      expect(body.data.fileUrl).toContain(`.${expectedExtension}`);
    }
  });

  test('should reject files larger than 10MB for cost optimization', async () => {
    const largeFileEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileType: 'image/jpeg',
        fileName: 'large-image.jpg',
        fileSize: 12 * 1024 * 1024 // 12MB - exceeds 10MB limit
      })
    };

    const result = await handler(largeFileEvent);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.errors.fileSize).toContain('File size must be less than 10MB');
  });

  test('should accept files smaller than 10MB', async () => {
    const validFileEvent = {
      ...mockEvent,
      body: JSON.stringify({
        fileType: 'image/jpeg',
        fileName: 'small-image.jpg',
        fileSize: 2 * 1024 * 1024 // 2MB - well under limit
      })
    };

    const result = await handler(validFileEvent);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
  });
});