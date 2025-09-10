/**
 * Unit tests for S3 bucket manager custom resource
 */

// Mock AWS SDK before importing the module
const mockS3Promise = jest.fn();
const mockS3 = {
  headBucket: jest.fn(() => ({ promise: mockS3Promise })),
  createBucket: jest.fn(() => ({ promise: mockS3Promise })),
  waitFor: jest.fn(() => ({ promise: mockS3Promise })),
  putBucketCors: jest.fn(() => ({ promise: mockS3Promise })),
  putPublicAccessBlock: jest.fn(() => ({ promise: mockS3Promise })),
  putBucketPolicy: jest.fn(() => ({ promise: mockS3Promise }))
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => mockS3)
}));

// Mock HTTPS module for CloudFormation response
const mockHttpsRequest = jest.fn();
jest.mock('https', () => ({
  request: mockHttpsRequest
}));

const { handler } = require('../../../src/custom-resources/s3-bucket-manager');

describe('S3 Bucket Manager Custom Resource', () => {
  let mockRequest;
  let mockContext;
  let mockEvent;

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

    // Setup common test data
    mockContext = {
      logStreamName: 'test-log-stream'
    };

    mockEvent = {
      RequestType: 'Create',
      ResponseURL: 'https://test-url.com',
      StackId: 'test-stack-id',
      RequestId: 'test-request-id',
      LogicalResourceId: 'BookCoversBucket',
      ResourceProperties: {
        BucketName: 'test-bucket-name',
        CorsConfiguration: {
          CorsRules: [{
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            MaxAge: 3000
          }]
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          BlockPublicPolicy: false,
          IgnorePublicAcls: false,
          RestrictPublicBuckets: true
        },
        EnablePublicRead: true
      }
    };
  });

  describe('Create operation', () => {
    test('should create new bucket when it does not exist', async () => {
      // Mock bucket does not exist
      mockS3Promise.mockRejectedValueOnce({ code: 'NoSuchBucket' })
        .mockResolvedValueOnce({ Location: '/test-bucket-name' })
        .mockResolvedValueOnce() // waitFor
        .mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).toHaveBeenCalledWith({ Bucket: 'test-bucket-name' });
      expect(mockS3.createBucket).toHaveBeenCalledWith({ Bucket: 'test-bucket-name' });
      expect(mockS3.waitFor).toHaveBeenCalledWith('bucketExists', { Bucket: 'test-bucket-name' });
      expect(mockS3.putBucketCors).toHaveBeenCalled();
      expect(mockS3.putPublicAccessBlock).toHaveBeenCalled();
      expect(mockS3.putBucketPolicy).toHaveBeenCalled();
    });

    test('should adopt existing bucket when it already exists', async () => {
      // Mock bucket exists
      mockS3Promise.mockResolvedValueOnce() // headBucket
        .mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).toHaveBeenCalledWith({ Bucket: 'test-bucket-name' });
      expect(mockS3.createBucket).not.toHaveBeenCalled();
      expect(mockS3.putBucketCors).toHaveBeenCalled();
      expect(mockS3.putPublicAccessBlock).toHaveBeenCalled();
      expect(mockS3.putBucketPolicy).toHaveBeenCalled();
    });

    test('should handle bucket creation when createBucket returns BucketAlreadyExists', async () => {
      // Mock bucket check fails but bucket exists during creation
      mockS3Promise.mockRejectedValueOnce({ code: 'NoSuchBucket' })
        .mockRejectedValueOnce({ code: 'BucketAlreadyExists' })
        .mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.createBucket).toHaveBeenCalled();
      expect(mockS3.putBucketCors).toHaveBeenCalled();
    });

    test('should handle bucket creation when createBucket returns BucketAlreadyOwnedByYou', async () => {
      // Mock bucket check fails but bucket is owned by us
      mockS3Promise.mockRejectedValueOnce({ code: 'NoSuchBucket' })
        .mockRejectedValueOnce({ code: 'BucketAlreadyOwnedByYou' })
        .mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.createBucket).toHaveBeenCalled();
      expect(mockS3.putBucketCors).toHaveBeenCalled();
    });

    test('should handle configuration errors gracefully', async () => {
      // Mock bucket exists but configuration fails
      mockS3Promise.mockResolvedValueOnce() // headBucket
        .mockRejectedValueOnce(new Error('CORS configuration failed'))
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).toHaveBeenCalled();
      expect(mockS3.putBucketCors).toHaveBeenCalled();
      // Should continue despite CORS failure
      expect(mockS3.putPublicAccessBlock).toHaveBeenCalled();
    });
  });

  describe('Update operation', () => {
    test('should update bucket configuration', async () => {
      mockEvent.RequestType = 'Update';
      mockS3Promise.mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockS3.putBucketCors).toHaveBeenCalled();
      expect(mockS3.putPublicAccessBlock).toHaveBeenCalled();
      expect(mockS3.putBucketPolicy).toHaveBeenCalled();
      expect(mockS3.createBucket).not.toHaveBeenCalled();
    });
  });

  describe('Delete operation', () => {
    test('should respect retention policy and not delete bucket', async () => {
      mockEvent.RequestType = 'Delete';
      mockEvent.ResourceProperties.DeletionPolicy = 'Retain';

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).not.toHaveBeenCalled();
      // No deletion operations should be called
    });

    test('should handle bucket deletion when policy allows', async () => {
      mockEvent.RequestType = 'Delete';
      // Don't set DeletionPolicy to 'Retain'
      delete mockEvent.ResourceProperties.DeletionPolicy;
      
      mockS3Promise.mockResolvedValueOnce(); // headBucket

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).toHaveBeenCalledWith({ Bucket: 'test-bucket-name' });
    });

    test('should handle non-existent bucket during deletion', async () => {
      mockEvent.RequestType = 'Delete';
      delete mockEvent.ResourceProperties.DeletionPolicy;
      
      mockS3Promise.mockRejectedValueOnce({ code: 'NoSuchBucket' });

      await handler(mockEvent, mockContext);

      expect(mockS3.headBucket).toHaveBeenCalledWith({ Bucket: 'test-bucket-name' });
    });
  });

  describe('Error handling', () => {
    test('should handle unknown request type', async () => {
      mockEvent.RequestType = 'Unknown';

      await handler(mockEvent, mockContext);

      // Should send FAILED response for unknown request type
      expect(mockRequest.write).toHaveBeenCalledWith(
        expect.stringContaining('"Status":"FAILED"')
      );
    });

    test('should handle S3 service errors during bucket creation', async () => {
      mockS3Promise.mockRejectedValueOnce({ code: 'NoSuchBucket' })
        .mockRejectedValueOnce({ code: 'AccessDenied', message: 'Access Denied' });

      await handler(mockEvent, mockContext);

      expect(mockRequest.write).toHaveBeenCalledWith(
        expect.stringContaining('"Status":"FAILED"')
      );
    });

    test('should handle unexpected errors during bucket existence check', async () => {
      mockS3Promise.mockRejectedValueOnce({ code: 'InternalError', message: 'Internal Server Error' });

      await handler(mockEvent, mockContext);

      expect(mockRequest.write).toHaveBeenCalledWith(
        expect.stringContaining('"Status":"FAILED"')
      );
    });
  });

  describe('Response sending', () => {
    test('should send SUCCESS response for successful operations', async () => {
      mockS3Promise.mockResolvedValueOnce() // headBucket
        .mockResolvedValueOnce() // putBucketCors
        .mockResolvedValueOnce() // putPublicAccessBlock
        .mockResolvedValueOnce(); // putBucketPolicy

      await handler(mockEvent, mockContext);

      expect(mockRequest.write).toHaveBeenCalledWith(
        expect.stringContaining('"Status":"SUCCESS"')
      );
      expect(mockRequest.write).toHaveBeenCalledWith(
        expect.stringContaining('"BucketName":"test-bucket-name"')
      );
    });
  });
});