// Mock AWS SDK — must include DynamoDB.DocumentClient for toyListing.js
jest.mock('../../../src/lib/aws-config', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getSignedUrlPromise: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/presigned-upload-url'),
  })),
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      put: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) }),
      get: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) }),
    })),
  },
}));

// Mock ToyListing so we control what create() returns
jest.mock('../../../src/models/toyListing');
const MockToyListing = require('../../../src/models/toyListing');

describe('generateUploadUrl handler', () => {
  let handler;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.BOOK_COVERS_BUCKET = 'test-book-covers-bucket';
    MockToyListing.create = jest.fn().mockResolvedValue({ listingId: 'mock-listing-id' });
    delete require.cache[require.resolve('../../../src/handlers/files/generateUploadUrl')];
    handler = require('../../../src/handlers/files/generateUploadUrl').handler;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MockToyListing.create = jest.fn().mockResolvedValue({ listingId: 'mock-listing-id' });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockEvent = {
    requestContext: { authorizer: { claims: { sub: 'test-user-id' } } },
    body: JSON.stringify({ fileType: 'image/jpeg', fileName: 'test-cover.jpg' }),
  };

  test('should generate upload URL and file URL for valid image (book context)', async () => {
    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('uploadUrl');
    expect(body.data).toHaveProperty('fileUrl');
    expect(body.data).toHaveProperty('fileKey');
    expect(body.data.fileUrl).toMatch(/^https:\/\/test-book-covers-bucket\.s3\.amazonaws\.com\/book-covers\/test-user-id\/.*\.jpeg$/);
    expect(body.data.fileKey).toMatch(/^book-covers\/test-user-id\/.*\.jpeg$/);
  });

  test('should generate library upload URL and return listingId for library context', async () => {
    const event = {
      ...mockEvent,
      body: JSON.stringify({ fileType: 'image/jpeg', fileName: 'toy.jpg', context: 'library', libraryType: 'toy' }),
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.fileKey).toMatch(/^library-images\/toy\/test-user-id\/.*\.jpeg$/);
    expect(body.data.listingId).toBe('mock-listing-id');
    expect(MockToyListing.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', libraryType: 'toy' }),
      'test-user-id'
    );
  });

  test('should reject invalid file types', async () => {
    const result = await handler({ ...mockEvent, body: JSON.stringify({ fileType: 'text/plain', fileName: 'test.txt' }) });
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.fileType).toContain('Invalid file type');
  });

  test('should reject missing file type', async () => {
    const result = await handler({ ...mockEvent, body: JSON.stringify({ fileName: 'test.jpg' }) });
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.fileType).toContain('File type is required');
  });

  test('should accept all valid image types', async () => {
    for (const fileType of ['image/jpeg', 'image/png', 'image/gif']) {
      const result = await handler({ ...mockEvent, body: JSON.stringify({ fileType, fileName: `test.${fileType.split('/')[1]}` }) });
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.fileUrl).toContain(`.${fileType.split('/')[1]}`);
    }
  });
});