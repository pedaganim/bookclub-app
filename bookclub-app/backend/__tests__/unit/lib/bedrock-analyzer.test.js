const AWS = require('aws-sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

jest.mock('aws-sdk', () => {
  const mS3 = { getObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return { S3: jest.fn(() => mS3) };
});

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const send = jest.fn();
  const MockClient = jest.fn(() => ({ send }));
  return {
    BedrockRuntimeClient: MockClient,
    InvokeModelCommand: jest.fn((args) => ({ __args: args })),
    __mock: { send },
  };
});

const { __mock: bedrockMock } = require('@aws-sdk/client-bedrock-runtime');
const { analyzeCoverImage } = require('../../../src/lib/bedrock-analyzer');

describe('bedrock-analyzer', () => {
  const bucket = 'test-bucket';
  const key = 'book-covers/abc.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock S3 getObject bytes
    const s3Instance = new AWS.S3();
    s3Instance.promise.mockResolvedValueOnce({ Body: Buffer.from('fake-bytes') });
    s3Instance.getObject.mockReturnValue(s3Instance);

    // Mock Bedrock response with Claude-style content
    const body = JSON.stringify({
      content: [
        { type: 'text', text: JSON.stringify({
          title_candidates: [{ value: 'Dune', confidence: 0.92 }],
          author_candidates: [{ value: 'Frank Herbert', confidence: 0.95 }],
          categories: ['Science Fiction'],
          age_group: 'adult',
          audience: ['sci-fi_readers'],
          themes: ['politics', 'ecology'],
          content_warnings: ['violence'],
          language_guess: 'en'
        }) }
      ]
    });
    // TextDecoder expects Uint8Array
    const u8 = new TextEncoder().encode(body);
    bedrockMock.send.mockResolvedValue({ body: u8 });
  });

  test('analyzes S3 image and returns normalized metadata', async () => {
    const res = await analyzeCoverImage({ bucket, key, contentType: 'image/jpeg' });
    expect(res.source).toBe('bedrock_claude3');
    expect(Array.isArray(res.title_candidates)).toBe(true);
    expect(res.title_candidates[0].value).toBe('Dune');
    expect(res.age_group).toBe('adult');
    expect(res.categories).toContain('Science Fiction');
  });

  test('handles non-JSON model text gracefully', async () => {
    // Override Bedrock mock to return non-JSON text
    const body = JSON.stringify({ content: [{ type: 'text', text: 'not json' }] });
    const u8 = new TextEncoder().encode(body);
    bedrockMock.send.mockResolvedValueOnce({ body: u8 });

    const res = await analyzeCoverImage({ bucket, key, contentType: 'image/jpeg' });
    expect(res).toHaveProperty('title_candidates');
    expect(res.categories).toEqual([]);
  });
});
