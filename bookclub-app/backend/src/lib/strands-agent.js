/**
 * Strands Agent Service
 * Orchestrates multi-step AI workflows for book cover analysis
 * 
 * The Strands pattern implements intelligent agent workflows that:
 * 1. Break down complex tasks into manageable steps (strands)
 * 2. Execute steps with fallback strategies
 * 3. Aggregate results with confidence scoring
 * 4. Provide transparent processing logs
 */

const bedrockVisionService = require('./bedrock-vision');
const visionLLMService = require('./vision-llm');
const bookMetadataService = require('./book-metadata');

class StrandsAgentService {
  constructor() {
    this.agents = new Map();
    this.maxRetries = 2;
    this.defaultTimeout = 120000; // 2 minutes
    
    // Define available analysis strands
    this.analysisStrands = {
      'bedrock-vision': {
        service: bedrockVisionService,
        priority: 1,
        cost: 'medium',
        accuracy: 'high',
        speed: 'medium'
      },
      'openai-vision': {
        service: visionLLMService,
        priority: 2,
        cost: 'high',
        accuracy: 'high',
        speed: 'fast'
      },
      'anthropic-vision': {
        service: visionLLMService,
        priority: 3,
        cost: 'high',
        accuracy: 'very-high',
        speed: 'slow'
      }
    };
  }

  /**
   * Create a new Strands Agent for book cover analysis
   * @param {string} agentId - Unique identifier for the agent
   * @param {Object} config - Agent configuration
   * @returns {Object} Agent instance
   */
  createAgent(agentId, config = {}) {
    const agent = {
      id: agentId,
      config: {
        strategy: config.strategy || 'best-effort', // 'best-effort', 'cost-optimized', 'accuracy-first'
        maxStrandAttempts: config.maxStrandAttempts || 3,
        fallbackEnabled: config.fallbackEnabled !== false,
        enrichWithGoogle: config.enrichWithGoogle !== false,
        parallelExecution: config.parallelExecution || false,
        confidenceThreshold: config.confidenceThreshold || 0.7,
        ...config
      },
      state: {
        status: 'created',
        currentStrand: null,
        completedStrands: [],
        failedStrands: [],
        results: {},
        errors: [],
        startTime: null,
        endTime: null
      },
      metadata: {
        s3Bucket: null,
        s3Key: null,
        userId: null,
        bookId: null
      }
    };

    this.agents.set(agentId, agent);
    return agent;
  }

  /**
   * Execute book cover analysis using Strands Agent workflow
   * @param {string} agentId - Agent identifier
   * @param {string} s3Bucket - S3 bucket containing the image
   * @param {string} s3Key - S3 key for the image
   * @param {Object} metadata - Additional metadata (userId, bookId)
   * @returns {Promise<Object>} Analysis results
   */
  async executeAnalysis(agentId, s3Bucket, s3Key, metadata = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      console.log(`[StrandsAgent] Starting analysis for agent ${agentId}: s3://${s3Bucket}/${s3Key}`);
      
      // Initialize agent state
      agent.state.status = 'running';
      agent.state.startTime = Date.now();
      agent.metadata = { s3Bucket, s3Key, ...metadata };

      // Phase 1: Execute vision analysis strands
      const visionResults = await this.executeVisionAnalysisStrands(agent);
      
      // Phase 2: Aggregate and validate results
      const aggregatedMetadata = await this.aggregateVisionResults(agent, visionResults);
      
      // Phase 3: Enrich with Google Books API if enabled
      let enrichedMetadata = aggregatedMetadata;
      if (agent.config.enrichWithGoogle) {
        enrichedMetadata = await this.enrichWithGoogleBooksAPI(agent, aggregatedMetadata);
      }
      
      // Phase 4: Calculate final confidence scores
      const finalResults = await this.calculateFinalConfidence(agent, enrichedMetadata, visionResults);
      
      // Update agent state
      agent.state.status = 'completed';
      agent.state.endTime = Date.now();
      agent.state.results = finalResults;

      console.log(`[StrandsAgent] Analysis completed for agent ${agentId} in ${agent.state.endTime - agent.state.startTime}ms`);
      
      return {
        success: true,
        agentId,
        processingTime: agent.state.endTime - agent.state.startTime,
        metadata: finalResults.metadata,
        confidence: finalResults.confidence,
        provenance: finalResults.provenance,
        cost: finalResults.cost,
        workflow: {
          completedStrands: agent.state.completedStrands,
          failedStrands: agent.state.failedStrands,
          strategy: agent.config.strategy
        }
      };

    } catch (error) {
      console.error(`[StrandsAgent] Error in agent ${agentId}:`, error);
      
      agent.state.status = 'failed';
      agent.state.endTime = Date.now();
      agent.state.errors.push({
        message: error.message,
        timestamp: Date.now(),
        phase: agent.state.currentStrand || 'initialization'
      });

      return {
        success: false,
        agentId,
        error: error.message,
        workflow: {
          completedStrands: agent.state.completedStrands,
          failedStrands: agent.state.failedStrands,
          errors: agent.state.errors
        }
      };
    }
  }

  /**
   * Execute vision analysis strands based on strategy
   */
  async executeVisionAnalysisStrands(agent) {
    const { strategy, parallelExecution, maxStrandAttempts } = agent.config;
    const results = {};

    // Determine execution order based on strategy
    const strandOrder = this.getStrandExecutionOrder(strategy);
    
    if (parallelExecution) {
      // Execute all strands in parallel
      console.log(`[StrandsAgent] Executing ${strandOrder.length} strands in parallel`);
      
      const promises = strandOrder.map(strandName => 
        this.executeStrand(agent, strandName)
      );
      
      const strandResults = await Promise.allSettled(promises);
      
      strandResults.forEach((result, index) => {
        const strandName = strandOrder[index];
        if (result.status === 'fulfilled') {
          results[strandName] = result.value;
          agent.state.completedStrands.push(strandName);
        } else {
          agent.state.failedStrands.push({
            strand: strandName,
            error: result.reason.message,
            timestamp: Date.now()
          });
        }
      });
      
    } else {
      // Execute strands sequentially with fallback
      for (const strandName of strandOrder) {
        try {
          console.log(`[StrandsAgent] Executing strand: ${strandName}`);
          agent.state.currentStrand = strandName;
          
          const result = await this.executeStrand(agent, strandName);
          results[strandName] = result;
          agent.state.completedStrands.push(strandName);
          
          // Check if we have sufficient confidence to skip remaining strands
          if (result.success && result.confidence?.overall >= agent.config.confidenceThreshold) {
            console.log(`[StrandsAgent] Sufficient confidence achieved with ${strandName}, skipping remaining strands`);
            break;
          }
          
        } catch (error) {
          console.warn(`[StrandsAgent] Strand ${strandName} failed:`, error.message);
          agent.state.failedStrands.push({
            strand: strandName,
            error: error.message,
            timestamp: Date.now()
          });
          
          // Continue to next strand if fallback is enabled
          if (!agent.config.fallbackEnabled) {
            throw error;
          }
        }
      }
    }

    return results;
  }

  /**
   * Get strand execution order based on strategy
   */
  getStrandExecutionOrder(strategy) {
    switch (strategy) {
      case 'cost-optimized':
        return ['bedrock-vision']; // Start with most cost-effective
      
      case 'accuracy-first':
        return ['anthropic-vision', 'bedrock-vision', 'openai-vision'];
      
      case 'best-effort':
      default:
        return ['bedrock-vision', 'openai-vision', 'anthropic-vision'];
    }
  }

  /**
   * Execute a single analysis strand
   */
  async executeStrand(agent, strandName) {
    const strand = this.analysisStrands[strandName];
    if (!strand) {
      throw new Error(`Unknown strand: ${strandName}`);
    }

    const { s3Bucket, s3Key } = agent.metadata;
    const options = this.getStrandOptions(strandName, agent.config);

    let result;
    
    if (strandName === 'bedrock-vision') {
      result = await strand.service.analyzeBookCover(s3Bucket, s3Key, options);
    } else if (strandName.includes('vision')) {
      // Configure vision LLM service for specific provider
      const provider = strandName.split('-')[0]; // 'openai' or 'anthropic'
      result = await strand.service.analyzeBookCover(s3Bucket, s3Key, {
        ...options,
        provider
      });
    } else {
      throw new Error(`Unsupported strand type: ${strandName}`);
    }

    return {
      ...result,
      strand: strandName,
      timestamp: Date.now(),
      cost: this.calculateStrandCost(strandName, result)
    };
  }

  /**
   * Get strand-specific options
   */
  getStrandOptions(strandName, agentConfig) {
    const baseOptions = {
      extract_categories: true,
      extract_series: true,
      extract_edition: true,
      confidence_threshold: agentConfig.confidenceThreshold
    };

    switch (strandName) {
      case 'bedrock-vision':
        return {
          ...baseOptions,
          model: agentConfig.bedrockModel || 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 4000,
          temperature: 0.1
        };
        
      case 'openai-vision':
        return {
          ...baseOptions,
          provider: 'openai',
          model: agentConfig.openaiModel || 'gpt-4-vision-preview'
        };
        
      case 'anthropic-vision':
        return {
          ...baseOptions,
          provider: 'anthropic',
          model: agentConfig.anthropicModel || 'claude-3-opus'
        };
        
      default:
        return baseOptions;
    }
  }

  /**
   * Calculate cost for a strand execution
   */
  calculateStrandCost(strandName, result) {
    if (result.cost) return result.cost;
    
    // Fallback cost estimation
    const costMap = {
      'bedrock-vision': 0.003,
      'openai-vision': 0.01,
      'anthropic-vision': 0.015
    };
    
    return costMap[strandName] || 0.005;
  }

  /**
   * Aggregate results from multiple vision analysis strands
   */
  async aggregateVisionResults(agent, visionResults) {
    const completedResults = Object.values(visionResults).filter(r => r.success);
    
    if (completedResults.length === 0) {
      throw new Error('All vision analysis strands failed');
    }

    console.log(`[StrandsAgent] Aggregating results from ${completedResults.length} successful strands`);

    // Use the highest confidence result as primary, others as validation
    const primaryResult = completedResults.reduce((best, current) => 
      (current.confidence?.overall || 0) > (best.confidence?.overall || 0) ? current : best
    );

    // Create consensus metadata by comparing results
    const consensusMetadata = this.createConsensusMetadata(completedResults);
    
    return {
      primary: primaryResult,
      consensus: consensusMetadata,
      allResults: completedResults,
      confidence: this.calculateAggregateConfidence(completedResults)
    };
  }

  /**
   * Create consensus metadata from multiple results
   */
  createConsensusMetadata(results) {
    const consensus = {
      title: null,
      authors: [],
      publisher: null,
      categories: [],
      series: null,
      edition: null,
      description: null,
      isbn: null,
      language: 'English'
    };

    // Title consensus - use most common or highest confidence
    const titles = results.map(r => r.metadata?.title).filter(Boolean);
    consensus.title = this.findConsensusValue(titles);

    // Authors consensus
    const allAuthors = results.flatMap(r => r.metadata?.authors || []);
    consensus.authors = [...new Set(allAuthors)].slice(0, 3); // Top 3 unique authors

    // Publisher consensus
    const publishers = results.map(r => r.metadata?.publisher).filter(Boolean);
    consensus.publisher = this.findConsensusValue(publishers);

    // Categories consensus - merge all unique categories
    const allCategories = results.flatMap(r => r.metadata?.categories || []);
    consensus.categories = [...new Set(allCategories)];

    // Use primary result for other fields
    const primaryResult = results[0];
    if (primaryResult?.metadata) {
      consensus.series = primaryResult.metadata.series;
      consensus.edition = primaryResult.metadata.edition;
      consensus.description = primaryResult.metadata.description;
      consensus.isbn = primaryResult.metadata.isbn;
      consensus.language = primaryResult.metadata.language || 'English';
    }

    return consensus;
  }

  /**
   * Find consensus value from array of values
   */
  findConsensusValue(values) {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];

    // Count occurrences
    const counts = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});

    // Return most common value
    return Object.entries(counts).reduce((a, b) => 
      counts[a[0]] > counts[b[0]] ? a : b
    )[0];
  }

  /**
   * Calculate aggregate confidence from multiple results
   */
  calculateAggregateConfidence(results) {
    if (results.length === 0) return { overall: 0 };

    const avgConfidence = results.reduce((sum, result) => {
      return sum + (result.confidence?.overall || 0);
    }, 0) / results.length;

    // Boost confidence if multiple results agree
    const agreementBonus = results.length > 1 ? 0.1 : 0;
    
    return {
      overall: Math.min(avgConfidence + agreementBonus, 1.0),
      individual: results.map(r => ({
        strand: r.strand,
        confidence: r.confidence?.overall || 0
      })),
      agreement: agreementBonus > 0
    };
  }

  /**
   * Enrich metadata with Google Books API
   */
  async enrichWithGoogleBooksAPI(agent, aggregatedMetadata) {
    try {
      console.log('[StrandsAgent] Enriching with Google Books API');
      
      const searchParams = {
        isbn: aggregatedMetadata.consensus.isbn,
        title: aggregatedMetadata.consensus.title,
        author: aggregatedMetadata.consensus.authors?.[0]
      };

      const googleMetadata = await bookMetadataService.searchBookMetadata(searchParams);
      
      if (googleMetadata) {
        // Merge Google metadata with consensus
        return {
          ...aggregatedMetadata,
          enriched: {
            ...aggregatedMetadata.consensus,
            // Google API data as validation/enhancement
            googleTitle: googleMetadata.title,
            googleAuthors: googleMetadata.authors,
            googleDescription: googleMetadata.description,
            googleCategories: googleMetadata.categories,
            googlePublisher: googleMetadata.publisher,
            googlePublishedDate: googleMetadata.publishedDate,
            googlePageCount: googleMetadata.pageCount,
            googleThumbnail: googleMetadata.thumbnail,
            googleISBN13: googleMetadata.isbn13,
            googleISBN10: googleMetadata.isbn10
          }
        };
      }
      
      return aggregatedMetadata;
    } catch (error) {
      console.warn('[StrandsAgent] Google Books enrichment failed:', error.message);
      return aggregatedMetadata;
    }
  }

  /**
   * Calculate final confidence scores and create provenance record
   */
  async calculateFinalConfidence(agent, enrichedMetadata, visionResults) {
    const totalCost = Object.values(visionResults).reduce((sum, result) => 
      sum + (result.cost || 0), 0
    );

    return {
      metadata: enrichedMetadata.enriched || enrichedMetadata.consensus,
      confidence: enrichedMetadata.confidence || { overall: 0 },
      provenance: {
        extractedAt: new Date().toISOString(),
        agentId: agent.id,
        strategy: agent.config.strategy,
        completedStrands: agent.state.completedStrands,
        failedStrands: agent.state.failedStrands,
        source: {
          bucket: agent.metadata.s3Bucket,
          key: agent.metadata.s3Key
        },
        processingDetails: {
          totalProcessingTime: agent.state.endTime - agent.state.startTime,
          strandsExecuted: agent.state.completedStrands.length,
          strandsAttempted: agent.state.completedStrands.length + agent.state.failedStrands.length,
          googleEnrichment: !!enrichedMetadata.enriched
        }
      },
      cost: {
        total: totalCost,
        breakdown: Object.entries(visionResults).map(([strand, result]) => ({
          strand,
          cost: result.cost || 0,
          success: result.success
        }))
      }
    };
  }

  /**
   * Get agent status and metrics
   */
  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return {
      id: agent.id,
      status: agent.state.status,
      config: agent.config,
      progress: {
        completedStrands: agent.state.completedStrands,
        failedStrands: agent.state.failedStrands,
        currentStrand: agent.state.currentStrand
      },
      timing: {
        startTime: agent.state.startTime,
        endTime: agent.state.endTime,
        duration: agent.state.endTime ? 
          agent.state.endTime - agent.state.startTime : 
          Date.now() - agent.state.startTime
      },
      errors: agent.state.errors
    };
  }

  /**
   * Clean up completed agents
   */
  cleanupAgent(agentId) {
    this.agents.delete(agentId);
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    const activeAgents = Array.from(this.agents.values());
    
    return {
      totalAgents: activeAgents.length,
      activeAgents: activeAgents.filter(a => a.state.status === 'running').length,
      completedAgents: activeAgents.filter(a => a.state.status === 'completed').length,
      failedAgents: activeAgents.filter(a => a.state.status === 'failed').length,
      availableStrands: Object.keys(this.analysisStrands),
      strandConfigurations: this.analysisStrands
    };
  }
}

module.exports = new StrandsAgentService();