/**
 * AWS Bedrock Vision Service
 * Advanced book cover image analysis using AWS Bedrock LLMs
 */
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

class BedrockVisionService {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.runtimeClient = new BedrockRuntimeClient({ region: this.region });
    this.bedrockClient = new BedrockClient({ region: this.region });
    this.isAvailable = this.checkAvailability();
    this.maxRetries = 3;
    this.timeout = 60000; // 60 seconds for Bedrock models
    
    // Model configurations with pricing and capabilities
    this.models = {
      'anthropic.claude-3-sonnet-20240229-v1:0': {
        name: 'Claude 3 Sonnet',
        costPerImage: 0.003,
        accuracy: 0.90,
        speed: 'medium',
        capabilities: ['vision', 'text-analysis', 'detailed-extraction'],
        recommended: true
      },
      'anthropic.claude-3-haiku-20240307-v1:0': {
        name: 'Claude 3 Haiku',
        costPerImage: 0.0002,
        accuracy: 0.82,
        speed: 'fast',
        capabilities: ['vision', 'basic-extraction'],
        recommended: false
      },
      'anthropic.claude-3-opus-20240229-v1:0': {
        name: 'Claude 3 Opus',
        costPerImage: 0.015,
        accuracy: 0.95,
        speed: 'slow',
        capabilities: ['vision', 'text-analysis', 'detailed-extraction', 'complex-reasoning'],
        recommended: false
      }
    };
    
    // Default model selection based on requirements
    this.defaultModel = 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  /**
   * Check if Bedrock services are available
   */
  checkAvailability() {
    // Bedrock is available if we have AWS credentials configured
    // In Lambda environment, this is handled by execution role
    try {
      // Basic availability check - will be validated during actual calls
      return true;
    } catch (error) {
      console.warn('[BedrockVision] Service check failed:', error.message);
      return false;
    }
  }

  /**
   * Get available Bedrock vision models
   */
  async getAvailableModels() {
    try {
      const command = new ListFoundationModelsCommand({
        byInferenceType: 'ON_DEMAND',
        byOutputModality: 'TEXT'
      });
      
      const response = await this.bedrockClient.send(command);
      const visionModels = response.modelSummaries.filter(model => 
        model.modelId.includes('claude-3') || 
        model.inputModalities?.includes('IMAGE')
      );
      
      return visionModels.map(model => ({
        modelId: model.modelId,
        modelName: model.modelName,
        inputModalities: model.inputModalities,
        outputModalities: model.outputModalities
      }));
    } catch (error) {
      console.error('[BedrockVision] Error listing models:', error);
      return Object.keys(this.models).map(modelId => ({
        modelId,
        modelName: this.models[modelId].name,
        inputModalities: ['TEXT', 'IMAGE'],
        outputModalities: ['TEXT']
      }));
    }
  }

  /**
   * Analyze book cover using Bedrock vision model
   * @param {string} s3Bucket - Source S3 bucket
   * @param {string} s3Key - Source S3 key
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeBookCover(s3Bucket, s3Key, options = {}) {
    if (!this.isAvailable) {
      console.log('[BedrockVision] Skipping Bedrock analysis - not available');
      return {
        success: false,
        reason: 'bedrock_not_available',
        metadata: {}
      };
    }

    const {
      model = this.defaultModel,
      maxTokens = 4000,
      temperature = 0.1,
      extract_categories = true,
      extract_series = true,
      extract_edition = true,
      confidence_threshold = 0.7
    } = options;

    try {
      console.log(`[BedrockVision] Analyzing book cover with ${model}: s3://${s3Bucket}/${s3Key}`);

      // Get base64 encoded image from S3
      const imageData = await this.getImageFromS3(s3Bucket, s3Key);
      
      // Prepare the prompt based on analysis requirements
      const prompt = this.buildAnalysisPrompt(options);
      
      // Invoke Bedrock model
      const startTime = Date.now();
      const analysis = await this.invokeBedrockModel(model, prompt, imageData, {
        maxTokens,
        temperature
      });
      const processingTime = Date.now() - startTime;

      // Parse and validate results
      const parsedMetadata = this.parseBedrockResults(analysis);
      
      // Calculate confidence scores
      const confidenceScores = this.calculateConfidenceScores(parsedMetadata, analysis);

      return {
        success: true,
        provider: 'bedrock',
        model,
        metadata: parsedMetadata,
        confidence: confidenceScores,
        rawAnalysis: analysis,
        processingTime,
        cost: this.estimateCost(model, imageData.length),
        image: {
          bucket: s3Bucket,
          key: s3Key,
          size: imageData.length
        }
      };

    } catch (error) {
      console.error('[BedrockVision] Error during Bedrock analysis:', error);
      return {
        success: false,
        error: error.message,
        provider: 'bedrock',
        model,
        metadata: {}
      };
    }
  }

  /**
   * Get image data from S3 as base64
   */
  async getImageFromS3(bucket, key) {
    try {
      const AWS = require('./aws-config');
      const s3 = new AWS.S3();
      
      const params = {
        Bucket: bucket,
        Key: key
      };
      
      const data = await s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      throw new Error(`Failed to get image from S3: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt for Bedrock model
   */
  buildAnalysisPrompt(options) {
    const {
      extract_categories = true,
      extract_series = true,
      extract_edition = true
    } = options;

    return `
Analyze this book cover image and extract detailed metadata in JSON format. Be precise and only include information that is clearly visible on the cover.

Extract the following information:

{
  "title": "Main book title (required - extract exactly as shown)",
  "subtitle": "Subtitle if present (null if not visible)",
  "authors": ["List of author names as they appear on the cover"],
  "series": ${extract_series ? '"Series name if this book is part of a series"' : 'null'},
  "edition": ${extract_edition ? '"Edition information (e.g., \'2nd Edition\', \'Revised\', \'Updated\')"' : 'null'},
  "publisher": "Publisher name if visible on cover",
  "categories": ${extract_categories ? '["Genre/category inferred from cover design, text, and visual elements"]' : '[]'},
  "isbn": "ISBN number if visible (ISBN-10 or ISBN-13)",
  "description": "Brief description based on visible cover text and promotional content",
  "language": "Detected language of the text",
  "awards": ["Any visible awards, badges, or recognition"],
  "endorsements": ["Quotes or endorsements visible on the cover"],
  "visual_analysis": {
    "dominant_colors": ["Primary colors used in the design"],
    "cover_style": "Style category (professional, artistic, minimalist, academic, etc.)",
    "text_layout": "Description of how text is arranged",
    "imagery_type": "Type of imagery used (photography, illustration, typography, etc.)",
    "target_audience": "Inferred target audience from design"
  },
  "text_quality": {
    "title_clarity": "Assessment of title readability (high/medium/low)",
    "author_visibility": "How prominent the author name is (high/medium/low)",
    "overall_legibility": "Overall text legibility (high/medium/low)"
  },
  "confidence_scores": {
    "title_extraction": 0.0-1.0,
    "author_extraction": 0.0-1.0,
    "publisher_extraction": 0.0-1.0,
    "category_inference": 0.0-1.0,
    "overall_analysis": 0.0-1.0
  }
}

Important guidelines:
- Only extract information that is clearly visible and readable
- Use null for unclear or missing elements
- Be conservative with confidence scores
- For categories, consider the book's apparent genre, academic level, and visual design
- Distinguish between main title and subtitle carefully
- Include any promotional text or marketing copy in the description
- Pay attention to series information that might be in smaller text

Return only the JSON object, no additional text.`;
  }

  /**
   * Invoke Bedrock model with image and prompt
   */
  async invokeBedrockModel(modelId, prompt, imageData, options = {}) {
    const {
      maxTokens = 4000,
      temperature = 0.1
    } = options;

    try {
      // Convert image data to base64 if it's a Buffer
      const base64Image = Buffer.isBuffer(imageData) 
        ? imageData.toString('base64') 
        : imageData;

      // Construct request payload based on model type
      let requestBody;
      
      if (modelId.includes('anthropic.claude-3')) {
        requestBody = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        };
      } else {
        throw new Error(`Unsupported model: ${modelId}`);
      }

      const command = new InvokeModelCommand({
        modelId: modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json'
      });

      const response = await this.runtimeClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract content based on model response format
      if (modelId.includes('anthropic.claude-3')) {
        return responseBody.content[0].text;
      }

      return responseBody;
    } catch (error) {
      console.error(`[BedrockVision] Model invocation error for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Parse Bedrock analysis results
   */
  parseBedrockResults(analysis) {
    try {
      // Try to parse as JSON first
      const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      
      // Normalize the structure
      return {
        title: this.normalizeTitle(parsed.title),
        subtitle: parsed.subtitle || null,
        authors: this.normalizeAuthors(parsed.authors),
        series: parsed.series || null,
        edition: parsed.edition || null,
        publisher: parsed.publisher || null,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        isbn: parsed.isbn || null,
        description: parsed.description || null,
        language: parsed.language || 'English',
        awards: Array.isArray(parsed.awards) ? parsed.awards : [],
        endorsements: Array.isArray(parsed.endorsements) ? parsed.endorsements : [],
        visualAnalysis: parsed.visual_analysis || {},
        textQuality: parsed.text_quality || {},
        bedrockConfidence: parsed.confidence_scores || {}
      };
    } catch (error) {
      console.error('[BedrockVision] Error parsing results:', error);
      // Fallback to text parsing
      return this.parseTextResponse(analysis);
    }
  }

  /**
   * Parse text response as fallback
   */
  parseTextResponse(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const result = { authors: [], categories: [], awards: [], endorsements: [] };
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('title:')) {
        result.title = line.split(':')[1]?.trim().replace(/"/g, '');
      } else if (lower.includes('author:')) {
        const author = line.split(':')[1]?.trim().replace(/"/g, '');
        if (author) result.authors = [author];
      } else if (lower.includes('publisher:')) {
        result.publisher = line.split(':')[1]?.trim().replace(/"/g, '');
      }
    });

    return result;
  }

  /**
   * Normalize title text
   */
  normalizeTitle(title) {
    if (!title) return null;
    return title.trim().replace(/\s+/g, ' ').replace(/[""]/g, '"').replace(/['']/g, "'");
  }

  /**
   * Normalize author names
   */
  normalizeAuthors(authors) {
    if (!Array.isArray(authors)) {
      return authors ? [String(authors).trim()] : [];
    }
    return authors.map(author => String(author).trim()).filter(author => author.length > 0);
  }

  /**
   * Calculate confidence scores
   */
  calculateConfidenceScores(metadata, rawAnalysis) {
    const scores = {
      overall: 0,
      title: 0,
      authors: 0,
      publisher: 0,
      categories: 0
    };

    // Use Bedrock-provided confidence scores if available
    if (metadata.bedrockConfidence) {
      scores.title = metadata.bedrockConfidence.title_extraction || 0;
      scores.authors = metadata.bedrockConfidence.author_extraction || 0;
      scores.publisher = metadata.bedrockConfidence.publisher_extraction || 0;
      scores.categories = metadata.bedrockConfidence.category_inference || 0;
      scores.overall = metadata.bedrockConfidence.overall_analysis || 0;
    } else {
      // Calculate based on completeness
      scores.title = metadata.title ? 0.9 : 0;
      scores.authors = metadata.authors?.length > 0 ? 0.85 : 0;
      scores.publisher = metadata.publisher ? 0.8 : 0;
      scores.categories = metadata.categories?.length > 0 ? 0.75 : 0;
      
      // Calculate overall confidence
      const weights = { title: 0.4, authors: 0.3, publisher: 0.2, categories: 0.1 };
      scores.overall = Object.entries(weights).reduce((sum, [field, weight]) => {
        return sum + (scores[field] * weight);
      }, 0);
    }

    return scores;
  }

  /**
   * Estimate processing cost
   */
  estimateCost(modelId, imageSizeBytes) {
    const modelConfig = this.models[modelId];
    if (!modelConfig) return 0.01; // fallback cost
    
    // Base cost per image
    let cost = modelConfig.costPerImage;
    
    // Adjust for image size (larger images may cost more)
    const sizeMB = imageSizeBytes / (1024 * 1024);
    if (sizeMB > 5) {
      cost *= 1.5; // 50% increase for large images
    }
    
    return cost;
  }

  /**
   * Get service metrics for monitoring
   */
  getServiceMetrics() {
    return {
      isAvailable: this.isAvailable,
      supportedModels: Object.keys(this.models),
      recommendedModel: this.defaultModel,
      modelDetails: this.models,
      averageProcessingTime: '15-45 seconds',
      region: this.region,
      advantages: [
        'Native AWS integration',
        'No API key management',
        'Region-specific deployment',
        'Enterprise-grade security',
        'Cost-effective for high volume'
      ],
      costOptimization: {
        budget: 'claude-3-haiku ($0.0002/image)',
        balanced: 'claude-3-sonnet ($0.003/image)',
        premium: 'claude-3-opus ($0.015/image)'
      }
    };
  }

  /**
   * Get detailed cost breakdown
   */
  getCostBreakdown(modelId, monthlyVolume = 1000) {
    const modelConfig = this.models[modelId] || this.models[this.defaultModel];
    const costPerImage = modelConfig.costPerImage;
    const monthlyCost = costPerImage * monthlyVolume;
    
    return {
      provider: 'bedrock',
      model: modelId,
      modelName: modelConfig.name,
      costPerImage: `$${costPerImage.toFixed(4)}`,
      monthlyVolume,
      monthlyCost: `$${monthlyCost.toFixed(2)}`,
      annualCost: `$${(monthlyCost * 12).toFixed(2)}`,
      accuracy: `${(modelConfig.accuracy * 100).toFixed(0)}%`,
      speed: modelConfig.speed,
      advantages: [
        'No API key management required',
        'Native AWS service integration',
        'Enterprise security and compliance',
        'Predictable pricing'
      ]
    };
  }
}

module.exports = new BedrockVisionService();