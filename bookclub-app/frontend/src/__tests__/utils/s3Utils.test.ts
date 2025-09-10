import { parseS3Url } from '../../utils/s3Utils';

describe('parseS3Url', () => {
  describe('virtual-hosted-style URLs', () => {
    it('should parse a standard virtual-hosted-style S3 URL', () => {
      const url = 'https://my-bucket.s3.us-east-1.amazonaws.com/path/to/my-file.jpg';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'path/to/my-file.jpg'
      });
    });

    it('should parse a virtual-hosted-style S3 URL with nested paths', () => {
      const url = 'https://my-bucket.s3.eu-west-1.amazonaws.com/uploads/2023/12/image.png';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'uploads/2023/12/image.png'
      });
    });

    it('should parse a virtual-hosted-style S3 URL with simple key', () => {
      const url = 'https://test-bucket.s3.amazonaws.com/file.txt';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'test-bucket',
        key: 'file.txt'
      });
    });
  });

  describe('path-style URLs', () => {
    it('should parse a path-style S3 URL', () => {
      const url = 'https://s3.us-east-1.amazonaws.com/my-bucket/path/to/my-file.jpg';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'path/to/my-file.jpg'
      });
    });

    it('should parse a path-style S3 URL with nested paths', () => {
      const url = 'https://s3.eu-west-1.amazonaws.com/test-bucket/uploads/2023/12/image.png';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'test-bucket',
        key: 'uploads/2023/12/image.png'
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid URL', () => {
      expect(() => parseS3Url('not-a-url')).toThrow('Failed to parse S3 URL');
    });

    it('should throw error for non-S3 URL', () => {
      expect(() => parseS3Url('https://example.com/file.jpg')).toThrow('Unsupported S3 URL format');
    });

    it('should throw error for virtual-hosted URL with missing bucket', () => {
      expect(() => parseS3Url('https://.s3.amazonaws.com/file.jpg')).toThrow('Invalid S3 URL: missing bucket or key');
    });

    it('should throw error for virtual-hosted URL with missing key', () => {
      expect(() => parseS3Url('https://bucket.s3.amazonaws.com/')).toThrow('Invalid S3 URL: missing bucket or key');
    });

    it('should throw error for path-style URL with missing bucket', () => {
      expect(() => parseS3Url('https://s3.amazonaws.com/')).toThrow('Invalid S3 URL: missing bucket or key in path');
    });

    it('should throw error for path-style URL with missing key', () => {
      expect(() => parseS3Url('https://s3.amazonaws.com/bucket/')).toThrow('Invalid S3 URL: missing bucket or key in path');
    });
  });

  describe('edge cases', () => {
    it('should handle URL with query parameters', () => {
      const url = 'https://my-bucket.s3.amazonaws.com/file.jpg?version=123';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'file.jpg'
      });
    });

    it('should handle URL with fragments', () => {
      const url = 'https://my-bucket.s3.amazonaws.com/file.jpg#section';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'file.jpg'
      });
    });

    it('should handle bucket names with hyphens and numbers', () => {
      const url = 'https://my-test-bucket-123.s3.us-west-2.amazonaws.com/folder/file-name_with.special-chars.jpg';
      const result = parseS3Url(url);
      
      expect(result).toEqual({
        bucket: 'my-test-bucket-123',
        key: 'folder/file-name_with.special-chars.jpg'
      });
    });
  });
});