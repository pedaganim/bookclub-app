# Bedrock Strands Agents Deployment Guide

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Node.js 18+** and npm installed
3. **Serverless Framework** installed globally
4. **Bedrock access** enabled in your AWS account

## Setup Instructions

### 1. Enable AWS Bedrock Access

```bash
# Request access to Bedrock models in AWS Console
# Navigate to: AWS Console > Bedrock > Model Access
# Request access to:
# - Anthropic Claude 3 Sonnet
# - Anthropic Claude 3 Haiku  
# - Anthropic Claude 3 Opus
```

### 2. Install Dependencies

```bash
cd bookclub-app/backend
npm install
```

The following new dependencies are automatically installed:
- `@aws-sdk/client-bedrock-runtime`
- `@aws-sdk/client-bedrock`

### 3. Configure Environment Variables

```bash
# .env (for local development)
STRANDS_STRATEGY=best-effort
ENABLE_BEDROCK_VISION=true

# Optional: Keep existing API keys for fallback
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 4. Deploy Infrastructure

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

The deployment automatically includes:
- ✅ Bedrock IAM permissions
- ✅ New environment variables
- ✅ Updated Lambda functions

### 5. Verify Deployment

```bash
# Run tests to verify integration
npm test

# Test specific Bedrock integration
npm test -- __tests__/unit/bedrock-vision.test.js
npm test -- __tests__/unit/strands-agent.test.js
```

## Configuration Options

### Strands Strategy Configuration

```yaml
# serverless.yml environment variables
STRANDS_STRATEGY: 
  - best-effort      # Balanced cost/accuracy (recommended)
  - cost-optimized   # Minimize costs, Bedrock only
  - accuracy-first   # Maximum accuracy, all providers
```

### Model Selection

```javascript
// Default configuration in bedrock-vision.js
const defaultModel = 'anthropic.claude-3-sonnet-20240229-v1:0';

// Available models:
// - anthropic.claude-3-haiku-20240307-v1:0   (fastest, cheapest)
// - anthropic.claude-3-sonnet-20240229-v1:0  (balanced, recommended)
// - anthropic.claude-3-opus-20240229-v1:0    (slowest, most accurate)
```

## Testing the Integration

### 1. Upload a Book Cover Image

Use the existing book upload flow - the system will automatically:
1. Trigger EventBridge event on S3 upload
2. Create Strands Agent for orchestration
3. Execute Bedrock vision analysis
4. Fallback to other providers if needed
5. Aggregate results and update book metadata

### 2. Monitor Processing

```bash
# Check CloudWatch logs for Strands Agent activity
aws logs tail /aws/lambda/bookclub-app-dev-extractBookMetadata --follow

# Look for log entries:
# [StrandsAgent] Starting analysis for agent...
# [BedrockVision] Analyzing book cover with...
# [StrandsAgent] Analysis completed for agent...
```

### 3. Verify Metadata Extraction

The enhanced metadata structure includes:
```json
{
  "title": "extracted title",
  "authors": ["author names"],
  "categories": ["inferred categories"],
  "confidence": {
    "overall": 0.88,
    "title": 0.95,
    "authors": 0.85
  },
  "provenance": {
    "extractedAt": "2024-01-15T10:30:00Z",
    "agentId": "metadata-extraction-123",
    "strategy": "best-effort",
    "completedStrands": ["bedrock-vision"],
    "cost": { "total": 0.003 }
  }
}
```

## Cost Monitoring

### View Processing Costs

```bash
# Check actual costs in CloudWatch custom metrics
aws cloudwatch get-metric-statistics \
  --namespace "BookClub/ImageAnalysis" \
  --metric-name "ProcessingCost" \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Sum
```

### Cost Optimization Tips

1. **Enable barcode detection first** - handles 80% of cases for free
2. **Use Claude 3 Haiku for high-volume** - 15x cheaper than Sonnet
3. **Set confidence thresholds** - avoid unnecessary fallback processing
4. **Monitor failed extractions** - may indicate model selection issues

## Troubleshooting

### Common Issues

**1. Bedrock Access Denied**
```
Error: User not authorized to perform bedrock:InvokeModel
```
Solution: Request model access in AWS Bedrock console

**2. Model Not Available**
```
Error: Model anthropic.claude-3-sonnet-20240229-v1:0 not found
```
Solution: Check model availability in your AWS region

**3. High Processing Costs**
```
Warning: Monthly costs exceeding budget
```
Solution: Switch to `cost-optimized` strategy or reduce image volume

**4. Low Extraction Accuracy**
```
Warning: Confidence scores below threshold
```
Solution: Switch to `accuracy-first` strategy or review image quality

### Debug Mode

Enable verbose logging:
```bash
# Set environment variable
MCP_DEBUG=true

# Check detailed logs
aws logs tail /aws/lambda/bookclub-app-dev-extractBookMetadata --follow
```

## Rollback Procedure

If issues arise, you can quickly rollback:

### 1. Disable Bedrock Integration
```yaml
# In serverless.yml
ENABLE_BEDROCK_VISION: false
VISION_LLM_PROVIDER: openai  # or anthropic
```

### 2. Redeploy
```bash
npm run deploy:dev
```

### 3. Verify Fallback
The system will automatically use the previous vision LLM integration.

## Performance Monitoring

### Key Metrics to Track

1. **Processing Time**: Should be 15-45 seconds for Bedrock
2. **Success Rate**: Should be >95% with fallback enabled
3. **Cost per Image**: Should average $0.003 for Sonnet
4. **Confidence Scores**: Should average >0.8 overall

### CloudWatch Dashboards

Create custom dashboards to monitor:
- Lambda function duration and errors
- Bedrock API calls and costs
- Strands Agent success/failure rates
- Metadata extraction accuracy

## Support

For issues specific to this implementation:
1. Check the test suite results
2. Review CloudWatch logs for error details
3. Verify Bedrock model access and permissions
4. Compare costs with expected usage patterns

The integration maintains full backward compatibility, so existing workflows continue to function while gaining the benefits of native AWS Bedrock integration.