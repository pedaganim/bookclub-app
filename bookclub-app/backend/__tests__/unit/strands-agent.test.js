/**
 * Test suite for Strands Agent Service
 * Tests the orchestration of multi-step AI workflows for book cover analysis
 */

const strandsAgentService = require('../../src/lib/strands-agent');

// Mock the vision services
jest.mock('../../src/lib/bedrock-vision', () => ({
  analyzeBookCover: jest.fn()
}));

jest.mock('../../src/lib/vision-llm', () => ({
  analyzeBookCover: jest.fn()
}));

jest.mock('../../src/lib/book-metadata', () => ({
  searchBookMetadata: jest.fn()
}));

describe('StrandsAgentService', () => {
  const bedrockVision = require('../../src/lib/bedrock-vision');
  const visionLLM = require('../../src/lib/vision-llm');
  const bookMetadata = require('../../src/lib/book-metadata');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Creation', () => {
    test('should create agent with default configuration', () => {
      const agent = strandsAgentService.createAgent('test-agent');

      expect(agent.id).toBe('test-agent');
      expect(agent.config.strategy).toBe('best-effort');
      expect(agent.config.fallbackEnabled).toBe(true);
      expect(agent.config.enrichWithGoogle).toBe(true);
      expect(agent.config.confidenceThreshold).toBe(0.7);
      expect(agent.state.status).toBe('created');
    });

    test('should create agent with custom configuration', () => {
      const customConfig = {
        strategy: 'cost-optimized',
        fallbackEnabled: false,
        confidenceThreshold: 0.8,
        parallelExecution: true
      };

      const agent = strandsAgentService.createAgent('custom-agent', customConfig);

      expect(agent.config.strategy).toBe('cost-optimized');
      expect(agent.config.fallbackEnabled).toBe(false);
      expect(agent.config.confidenceThreshold).toBe(0.8);
      expect(agent.config.parallelExecution).toBe(true);
    });
  });

  describe('Strand Execution Order', () => {
    test('should return correct order for best-effort strategy', () => {
      const agent = strandsAgentService.createAgent('test-agent', { strategy: 'best-effort' });
      const order = strandsAgentService.getStrandExecutionOrder('best-effort');
      
      expect(order).toEqual(['bedrock-vision', 'openai-vision', 'anthropic-vision']);
    });

    test('should return correct order for cost-optimized strategy', () => {
      const order = strandsAgentService.getStrandExecutionOrder('cost-optimized');
      
      expect(order).toEqual(['bedrock-vision']);
    });

    test('should return correct order for accuracy-first strategy', () => {
      const order = strandsAgentService.getStrandExecutionOrder('accuracy-first');
      
      expect(order).toEqual(['anthropic-vision', 'bedrock-vision', 'openai-vision']);
    });
  });

  describe('Analysis Execution', () => {
    test('should execute successful analysis with Bedrock vision', async () => {
      // Mock successful Bedrock response
      bedrockVision.analyzeBookCover.mockResolvedValue({
        success: true,
        provider: 'bedrock',
        model: 'claude-3-sonnet',
        metadata: {
          title: 'Clean Code',
          authors: ['Robert C. Martin'],
          publisher: 'Prentice Hall',
          categories: ['Programming']
        },
        confidence: {
          overall: 0.9,
          title: 0.95,
          authors: 0.85
        },
        processingTime: 15000,
        cost: 0.003
      });

      const agent = strandsAgentService.createAgent('test-agent', {
        strategy: 'cost-optimized',
        enrichWithGoogle: false
      });

      const result = await strandsAgentService.executeAnalysis(
        'test-agent',
        'test-bucket',
        'test-key',
        { userId: 'user123', bookId: 'book456' }
      );

      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('Clean Code');
      expect(result.confidence.overall).toBeGreaterThan(0.8);
      expect(result.workflow.completedStrands).toContain('bedrock-vision');
      expect(bedrockVision.analyzeBookCover).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        expect.objectContaining({
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          extract_categories: true
        })
      );
    });

    test('should fallback to next strand when first one fails', async () => {
      // Mock Bedrock failure and OpenAI success
      bedrockVision.analyzeBookCover.mockRejectedValue(new Error('Bedrock failed'));
      visionLLM.analyzeBookCover.mockResolvedValue({
        success: true,
        provider: 'openai',
        metadata: {
          title: 'Clean Code',
          authors: ['Robert C. Martin']
        },
        confidence: { overall: 0.85 },
        processingTime: 10000
      });

      const agent = strandsAgentService.createAgent('test-agent', {
        strategy: 'best-effort',
        enrichWithGoogle: false
      });

      const result = await strandsAgentService.executeAnalysis(
        'test-agent',
        'test-bucket',
        'test-key'
      );

      expect(result.success).toBe(true);
      expect(result.workflow.failedStrands).toHaveLength(1);
      expect(result.workflow.failedStrands[0].strand).toBe('bedrock-vision');
      expect(result.workflow.completedStrands).toContain('openai-vision');
    });

    test('should execute parallel analysis when configured', async () => {
      // Mock all services to succeed
      bedrockVision.analyzeBookCover.mockResolvedValue({
        success: true,
        metadata: { title: 'Clean Code' },
        confidence: { overall: 0.85 },
        cost: 0.003
      });

      visionLLM.analyzeBookCover
        .mockResolvedValueOnce({
          success: true,
          metadata: { title: 'Clean Code' },
          confidence: { overall: 0.80 }
        })
        .mockResolvedValueOnce({
          success: true,
          metadata: { title: 'Clean Code' },
          confidence: { overall: 0.90 }
        });

      const agent = strandsAgentService.createAgent('test-agent', {
        parallelExecution: true,
        enrichWithGoogle: false
      });

      const result = await strandsAgentService.executeAnalysis(
        'test-agent',
        'test-bucket',
        'test-key'
      );

      expect(result.success).toBe(true);
      expect(result.workflow.completedStrands).toHaveLength(3);
      expect(bedrockVision.analyzeBookCover).toHaveBeenCalled();
      expect(visionLLM.analyzeBookCover).toHaveBeenCalledTimes(2);
    });

    test('should enrich with Google Books API when enabled', async () => {
      bedrockVision.analyzeBookCover.mockResolvedValue({
        success: true,
        metadata: {
          title: 'Clean Code',
          isbn: '9780132350884'
        },
        confidence: { overall: 0.85 },
        cost: 0.003
      });

      bookMetadata.searchBookMetadata.mockResolvedValue({
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        authors: ['Robert C. Martin'],
        description: 'Even bad code can function...',
        categories: ['Computers', 'Programming'],
        publisher: 'Prentice Hall',
        publishedDate: '2008-08-01'
      });

      const agent = strandsAgentService.createAgent('test-agent', {
        strategy: 'cost-optimized',
        enrichWithGoogle: true
      });

      const result = await strandsAgentService.executeAnalysis(
        'test-agent',
        'test-bucket',
        'test-key'
      );

      expect(result.success).toBe(true);
      expect(result.metadata.googleTitle).toBe('Clean Code: A Handbook of Agile Software Craftsmanship');
      expect(result.metadata.googleAuthors).toEqual(['Robert C. Martin']);
      expect(bookMetadata.searchBookMetadata).toHaveBeenCalledWith({
        isbn: '9780132350884',
        title: 'Clean Code',
        author: undefined
      });
    });

    test('should handle complete failure gracefully', async () => {
      // Mock all services to fail
      bedrockVision.analyzeBookCover.mockRejectedValue(new Error('Bedrock failed'));
      visionLLM.analyzeBookCover.mockRejectedValue(new Error('Vision LLM failed'));

      const agent = strandsAgentService.createAgent('test-agent', {
        fallbackEnabled: true,
        enrichWithGoogle: false
      });

      const result = await strandsAgentService.executeAnalysis(
        'test-agent',
        'test-bucket',
        'test-key'
      );

      expect(result.success).toBe(false);
      expect(result.workflow.failedStrands.length).toBeGreaterThan(0);
      expect(result.error).toContain('All vision analysis strands failed');
    });
  });

  describe('Consensus Building', () => {
    test('should create consensus metadata from multiple results', () => {
      const results = [
        {
          success: true,
          metadata: {
            title: 'Clean Code',
            authors: ['Robert C. Martin'],
            categories: ['Programming']
          },
          confidence: { overall: 0.85 }
        },
        {
          success: true,
          metadata: {
            title: 'Clean Code',
            authors: ['Robert Martin'],
            categories: ['Software Engineering']
          },
          confidence: { overall: 0.80 }
        }
      ];

      const consensus = strandsAgentService.createConsensusMetadata(results);

      expect(consensus.title).toBe('Clean Code');
      expect(consensus.authors).toEqual(['Robert C. Martin', 'Robert Martin']);
      expect(consensus.categories).toEqual(['Programming', 'Software Engineering']);
    });

    test('should calculate aggregate confidence correctly', () => {
      const results = [
        { confidence: { overall: 0.9 }, strand: 'bedrock-vision' },
        { confidence: { overall: 0.8 }, strand: 'openai-vision' }
      ];

      const confidence = strandsAgentService.calculateAggregateConfidence(results);

      expect(confidence.overall).toBeCloseTo(0.95); // (0.9 + 0.8) / 2 + 0.1 agreement bonus
      expect(confidence.agreement).toBe(true);
      expect(confidence.individual).toHaveLength(2);
    });
  });

  describe('Agent Management', () => {
    test('should track agent status correctly', () => {
      const agent = strandsAgentService.createAgent('status-test');
      const status = strandsAgentService.getAgentStatus('status-test');

      expect(status.id).toBe('status-test');
      expect(status.status).toBe('created');
      expect(status.progress.completedStrands).toEqual([]);
    });

    test('should cleanup agent successfully', () => {
      strandsAgentService.createAgent('cleanup-test');
      expect(strandsAgentService.getAgentStatus('cleanup-test')).toBeDefined();

      strandsAgentService.cleanupAgent('cleanup-test');
      expect(strandsAgentService.getAgentStatus('cleanup-test')).toBeNull();
    });

    test('should provide service statistics', () => {
      // Clean up any existing agents first
      const currentStats = strandsAgentService.getServiceStats();
      for (let i = 0; i < currentStats.totalAgents; i++) {
        // Since we can't easily get agent IDs, we'll work with the current state
      }
      
      strandsAgentService.createAgent('stats-test-1');
      strandsAgentService.createAgent('stats-test-2');

      const stats = strandsAgentService.getServiceStats();

      expect(stats.totalAgents).toBeGreaterThanOrEqual(2);
      expect(stats.availableStrands).toEqual(['bedrock-vision', 'openai-vision', 'anthropic-vision']);
      expect(stats.strandConfigurations).toBeDefined();
      
      // Cleanup
      strandsAgentService.cleanupAgent('stats-test-1');
      strandsAgentService.cleanupAgent('stats-test-2');
    });
  });

  describe('Error Handling', () => {
    test('should handle agent not found error', async () => {
      await expect(strandsAgentService.executeAnalysis('nonexistent', 'bucket', 'key'))
        .rejects.toThrow('Agent nonexistent not found');
    });

    test('should handle unknown strand error', async () => {
      const agent = strandsAgentService.createAgent('error-test');
      
      await expect(strandsAgentService.executeStrand(agent, 'unknown-strand'))
        .rejects.toThrow('Unknown strand: unknown-strand');
    });
  });
});