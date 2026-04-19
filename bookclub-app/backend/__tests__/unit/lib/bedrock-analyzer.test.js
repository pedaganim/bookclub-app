const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const AWS = require('aws-sdk');
const sharp = require('sharp');

// Mock AWS SDKs
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('aws-sdk');
jest.mock('sharp');

// Import after mocks
const { analyzeUniversalItemImage } = require('../../../src/lib/bedrock-analyzer');

describe('Universal Item Analyzer', () => {
  let mockBedrockClient;
  let mockS3;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Bedrock client
    mockBedrockClient = {
      send: jest.fn()
    };
    BedrockRuntimeClient.mockImplementation(() => mockBedrockClient);
    
    // Mock S3
    mockS3 = {
      getObject: jest.fn().mockReturnThis(),
      promise: jest.fn().mockResolvedValue({ Body: Buffer.from('mock image bytes') })
    };
    AWS.S3.mockImplementation(() => mockS3);

    // Mock Sharp
    sharp.mockImplementation(() => ({
      metadata: jest.fn().mockResolvedValue({ width: 1000, height: 1000 }),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized image bytes'))
    }));
  });

  test('correctly parses a book response from Bedrock', async () => {
    const mockResponse = {
      body: new TextEncoder().encode(JSON.stringify({
        content: [{
          text: JSON.stringify({
            category: 'book',
            title: 'The Great Gatsby',
            description: 'A classic novel about wealth and love.',
            author: 'F. Scott Fitzgerald',
            ageRange: 'Adult'
          })
        }]
      }))
    };
    mockBedrockClient.send.mockResolvedValue(mockResponse);

    const result = await analyzeUniversalItemImage({ bucket: 'test-bucket', key: 'test-key' });

    expect(result).toEqual({
      category: 'book',
      title: 'The Great Gatsby',
      description: 'A classic novel about wealth and love.',
      author: 'F. Scott Fitzgerald',
      ageRange: 'Adult',
      raw: expect.any(Object),
      source: 'bedrock_universal_v1'
    });
  });

  test('correctly parses a toy response with null author', async () => {
    const mockResponse = {
      body: new TextEncoder().encode(JSON.stringify({
        content: [{
          text: JSON.stringify({
            category: 'toy',
            title: 'LEGO Star Wars X-Wing',
            description: 'Building set for Star Wars fans.',
            author: null,
            ageRange: '8-12 years'
          })
        }]
      }))
    };
    mockBedrockClient.send.mockResolvedValue(mockResponse);

    const result = await analyzeUniversalItemImage({ bucket: 'test-bucket', key: 'test-key' });

    expect(result.category).toBe('toy');
    expect(result.author).toBeNull();
    expect(result.ageRange).toBe('8-12 years');
  });

  test('handles malformed JSON response gracefully', async () => {
    const mockResponse = {
      body: new TextEncoder().encode(JSON.stringify({
        content: [{
          text: 'Here is the JSON: ```json {"category": "tool", "title": "Hammer"} ``` and some commentary.'
        }]
      }))
    };
    mockBedrockClient.send.mockResolvedValue(mockResponse);

    const result = await analyzeUniversalItemImage({ bucket: 'test-bucket', key: 'test-key' });

    expect(result.category).toBe('tool');
    expect(result.title).toBe('Hammer');
  });

  test('defaults to other if no category returned', async () => {
    const mockResponse = {
      body: new TextEncoder().encode(JSON.stringify({
        content: [{
          text: JSON.stringify({
            title: 'Misc Item',
          })
        }]
      }))
    };
    mockBedrockClient.send.mockResolvedValue(mockResponse);

    const result = await analyzeUniversalItemImage({ bucket: 'test-bucket', key: 'test-key' });

    expect(result.category).toBe('other');
    expect(result.title).toBe('Misc Item');
  });
});
