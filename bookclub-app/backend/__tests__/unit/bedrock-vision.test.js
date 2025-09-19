/**
 * Test suite for Bedrock Vision Service
 * Tests the AWS Bedrock integration for book cover image analysis
 */

const bedrockVisionService = require('../../src/lib/bedrock-vision');

// Mock AWS SDK Bedrock clients
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  InvokeModelCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-bedrock', () => ({
  BedrockClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  ListFoundationModelsCommand: jest.fn()
}));

// Mock AWS S3 for image retrieval
jest.mock('../../src/lib/aws-config', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('mock-image-data')
      })
    })
  }))
}));

describe('BedrockVisionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with correct default configuration', () => {
      expect(bedrockVisionService.region).toBe('us-east-1');
      expect(bedrockVisionService.isAvailable).toBe(true);
      expect(bedrockVisionService.defaultModel).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    });

    test('should have correct model configurations', () => {
      const models = bedrockVisionService.models;
      
      expect(models['anthropic.claude-3-sonnet-20240229-v1:0']).toEqual({
        name: 'Claude 3 Sonnet',
        costPerImage: 0.003,
        accuracy: 0.90,
        speed: 'medium',
        capabilities: ['vision', 'text-analysis', 'detailed-extraction'],
        recommended: true
      });

      expect(models['anthropic.claude-3-haiku-20240307-v1:0']).toEqual({
        name: 'Claude 3 Haiku',
        costPerImage: 0.0002,
        accuracy: 0.82,
        speed: 'fast',
        capabilities: ['vision', 'basic-extraction'],
        recommended: false
      });

      expect(models['anthropic.claude-3-opus-20240229-v1:0']).toEqual({
        name: 'Claude 3 Opus',
        costPerImage: 0.015,
        accuracy: 0.95,
        speed: 'slow',
        capabilities: ['vision', 'text-analysis', 'detailed-extraction', 'complex-reasoning'],
        recommended: false
      });
    });
  });

  describe('getAvailableModels', () => {
    test('should return available models when Bedrock API is accessible', async () => {
      const { BedrockClient } = require('@aws-sdk/client-bedrock');
      const mockSend = jest.fn().mockResolvedValue({
        modelSummaries: [
          {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            modelName: 'Claude 3 Sonnet',
            inputModalities: ['TEXT', 'IMAGE'],
            outputModalities: ['TEXT']
          }
        ]
      });
      
      // Create a fresh instance for this test
      const testService = Object.create(bedrockVisionService);
      testService.bedrockClient = { send: mockSend };

      const models = await testService.getAvailableModels();
      
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        modelName: 'Claude 3 Sonnet',
        inputModalities: ['TEXT', 'IMAGE'],
        outputModalities: ['TEXT']
      });
    });

    test('should return fallback models when Bedrock API fails', async () => {
      const { BedrockClient } = require('@aws-sdk/client-bedrock');
      const mockSend = jest.fn().mockRejectedValue(new Error('API Error'));
      
      BedrockClient.mockImplementation(() => ({ send: mockSend }));

      const models = await bedrockVisionService.getAvailableModels();
      
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('modelId');
      expect(models[0]).toHaveProperty('modelName');
    });
  });

  describe('analyzeBookCover', () => {
    test('should return unavailable result when service is not available', async () => {
      // Temporarily disable service
      bedrockVisionService.isAvailable = false;

      const result = await bedrockVisionService.analyzeBookCover('test-bucket', 'test-key');

      expect(result).toEqual({
        success: false,
        reason: 'bedrock_not_available',
        metadata: {}
      });

      // Restore service availability
      bedrockVisionService.isAvailable = true;
    });

    test('should successfully analyze book cover with default model', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            title: 'Clean Code',
            authors: ['Robert C. Martin'],
            publisher: 'Prentice Hall',
            categories: ['Programming', 'Software Engineering'],
            confidence_scores: {
              title_extraction: 0.95,
              author_extraction: 0.90,
              overall_analysis: 0.92
            }
          })
        }]
      };

      // Create a test service instance with mocked methods
      const testService = Object.create(bedrockVisionService);
      testService.runtimeClient = {
        send: jest.fn().mockResolvedValue({
          body: new TextEncoder().encode(JSON.stringify(mockResponse))
        })
      };

      const result = await testService.analyzeBookCover('test-bucket', 'test-key');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('bedrock');
      expect(result.model).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
      expect(result.metadata.title).toBe('Clean Code');
      expect(result.metadata.authors).toEqual(['Robert C. Martin']);
      expect(result.confidence.title).toBe(0.95);
    });

    test('should handle analysis errors gracefully', async () => {
      // Create a test service instance with mocked methods
      const testService = Object.create(bedrockVisionService);
      testService.runtimeClient = {
        send: jest.fn().mockRejectedValue(new Error('Model invocation failed'))
      };

      const result = await testService.analyzeBookCover('test-bucket', 'test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Model invocation failed');
      expect(result.provider).toBe('bedrock');
    });
  });

  describe('Cost Estimation', () => {
    test('should estimate cost correctly for different models', () => {
      const sonnetCost = bedrockVisionService.estimateCost(
        'anthropic.claude-3-sonnet-20240229-v1:0', 
        1024 * 1024 // 1MB image
      );
      expect(sonnetCost).toBe(0.003);

      const haikuCost = bedrockVisionService.estimateCost(
        'anthropic.claude-3-haiku-20240307-v1:0', 
        1024 * 1024
      );
      expect(haikuCost).toBe(0.0002);

      const opusCost = bedrockVisionService.estimateCost(
        'anthropic.claude-3-opus-20240229-v1:0', 
        1024 * 1024
      );
      expect(opusCost).toBe(0.015);
    });

    test('should apply size multiplier for large images', () => {
      const largeCost = bedrockVisionService.estimateCost(
        'anthropic.claude-3-sonnet-20240229-v1:0', 
        6 * 1024 * 1024 // 6MB image
      );
      expect(largeCost).toBe(0.003 * 1.5); // 50% increase for large images
    });
  });

  describe('getCostBreakdown', () => {
    test('should provide detailed cost analysis', () => {
      const breakdown = bedrockVisionService.getCostBreakdown(
        'anthropic.claude-3-sonnet-20240229-v1:0',
        1000 // monthly volume
      );

      expect(breakdown).toEqual({
        provider: 'bedrock',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        modelName: 'Claude 3 Sonnet',
        costPerImage: '$0.0030',
        monthlyVolume: 1000,
        monthlyCost: '$3.00',
        annualCost: '$36.00',
        accuracy: '90%',
        speed: 'medium',
        advantages: [
          'No API key management required',
          'Native AWS service integration',
          'Enterprise security and compliance',
          'Predictable pricing'
        ]
      });
    });
  });

  describe('Service Metrics', () => {
    test('should provide comprehensive service metrics', () => {
      const metrics = bedrockVisionService.getServiceMetrics();

      expect(metrics.isAvailable).toBe(true);
      expect(metrics.supportedModels).toEqual([
        'anthropic.claude-3-sonnet-20240229-v1:0',
        'anthropic.claude-3-haiku-20240307-v1:0',
        'anthropic.claude-3-opus-20240229-v1:0'
      ]);
      expect(metrics.recommendedModel).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
      expect(metrics.region).toBe('us-east-1');
      expect(metrics.advantages).toContain('Native AWS integration');
    });
  });

  describe('Text Parsing Fallback', () => {
    test('should parse text response when JSON parsing fails', () => {
      const textResponse = `
        Title: "Clean Code"
        Author: "Robert C. Martin"
        Publisher: "Prentice Hall"
      `;

      const result = bedrockVisionService.parseTextResponse(textResponse);

      expect(result.title).toBe('Clean Code');
      expect(result.authors).toEqual(['Robert C. Martin']);
      expect(result.publisher).toBe('Prentice Hall');
    });
  });
});