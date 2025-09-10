import { S3UrlComponents } from '../types';

/**
 * Parses an S3 URL to extract bucket name and object key
 * Supports both virtual-hosted-style and path-style URLs
 * @param s3Url - The S3 URL to parse
 * @returns Object containing bucket and key, or throws error if invalid
 */
export function parseS3Url(s3Url: string): S3UrlComponents {
  try {
    const url = new URL(s3Url);
    
    // Handle virtual-hosted-style URLs: https://bucket.s3.region.amazonaws.com/path/to/object
    if (url.hostname.includes('.s3.') && url.hostname.endsWith('.amazonaws.com')) {
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1); // Remove leading slash
      
      if (!bucket || !key) {
        throw new Error('Invalid S3 URL: missing bucket or key');
      }
      
      return { bucket, key };
    }
    
    // Handle path-style URLs: https://s3.region.amazonaws.com/bucket/path/to/object
    if (url.hostname.startsWith('s3.') && url.hostname.endsWith('.amazonaws.com')) {
      const pathParts = url.pathname.substring(1).split('/'); // Remove leading slash and split
      const bucket = pathParts[0];
      const key = pathParts.slice(1).join('/');
      
      if (!bucket || !key) {
        throw new Error('Invalid S3 URL: missing bucket or key in path');
      }
      
      return { bucket, key };
    }
    
    // Handle custom domain or other formats
    throw new Error('Unsupported S3 URL format');
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse S3 URL: ${error.message}`);
    }
    throw new Error('Failed to parse S3 URL: Invalid URL format');
  }
}