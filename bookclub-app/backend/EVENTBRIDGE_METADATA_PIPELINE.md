# Advanced Book Cover Metadata Extraction Pipeline

## Overview

This document describes the implementation of the advanced, EventBridge-triggered metadata extraction pipeline for book cover images. The pipeline processes uploaded book cover images to extract rich metadata using multiple techniques and data sources.

## Architecture

### Core Components

1. **S3 Upload Handler** (`processUpload.js`)
   - Creates minimal book entry with placeholder data
   - Publishes `S3.ObjectCreated` event to EventBridge
   - No metadata processing during upload (deferred to EventBridge)

2. **EventBridge Metadata Extraction Handler** (`extractBookMetadata.js`)
   - Triggered by `S3.ObjectCreated` events
   - Orchestrates advanced metadata extraction pipeline
   - Updates book table with rich metadata and confidence scores

3. **Manual Extraction API** (`extractMetadata.js`)
   - Endpoint: `POST /books/{bookId}/extract-metadata`
   - Allows manual triggering of metadata extraction
   - Publishes same EventBridge event for consistent processing

### Event Flow

```
S3 Image Upload
    ↓
processUpload Handler
    ↓ (creates minimal book)
    ↓ (publishes S3.ObjectCreated event)
    ↓
EventBridge
    ↓
extractBookMetadata Handler
    ↓ (advanced processing)
    ↓ (updates book table)
    ↓ (publishes Book.MetadataExtracted event)
    ↓
Downstream Processors
```

## Metadata Extraction Pipeline

### Phase 1: Image Analysis
- **Textract OCR**: Extracts raw text from book cover
- **Future**: Image preprocessing (deskew, denoise, normalize)
- **Future**: Barcode detection for ISBN lookup
- **Future**: Vision LLM analysis for advanced parsing

### Phase 2: Catalog Lookup
- **Google Books API**: Authoritative metadata lookup
- **Open Library**: Fallback metadata source
- **Future**: Additional catalog sources

### Phase 3: Data Processing
- **Resolver/Ranker**: Merges and scores metadata from multiple sources
- **Normalizer**: Standardizes field formats (dates, ISBNs, author names)
- **Validator**: Ensures data quality and consistency

### Phase 4: Storage
- **Advanced Metadata Column**: Rich metadata with confidence and provenance
- **Confidence Scores**: Per-field and overall confidence ratings
- **Provenance Tracking**: Source attribution for each piece of metadata

## Data Structure

### Advanced Metadata Schema

```json
{
  "extractedAt": "2024-01-15T10:30:00Z",
  "source": {
    "bucket": "bookclub-bucket",
    "key": "book-covers/user123/book.jpg"
  },
  "metadata": {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn10": "0132350882",
    "isbn13": "9780132350884",
    "publisher": "Prentice Hall",
    "publishedDate": "2008-08-01",
    "description": "A handbook of agile software craftsmanship"
  },
  "confidence": {
    "overall": 92,
    "title": 95,
    "author": 90,
    "isbn": 98,
    "publisher": 85,
    "publishedDate": 80
  },
  "provenance": {
    "textract": {
      "extractedText": "Full OCR text...",
      "confidence": 92,
      "textBlocks": 15
    },
    "catalog": {
      "source": "google-books",
      "confidence": 95,
      "data": { /* full catalog response */ }
    }
  },
  "overallConfidence": 92
}
```

## Configuration

### EventBridge Settings
- **Event Bus**: Default AWS EventBridge bus
- **Event Source**: `bookclub.app`
- **Event Types**: 
  - `S3.ObjectCreated` (from upload)
  - `Book.MetadataExtracted` (completion)

### Lambda Settings
- **Timeout**: 300 seconds (5 minutes)
- **Memory**: 1024 MB (adjustable based on processing needs)
- **Dead Letter Queue**: Configured for error handling
- **Retry Policy**: 2 retry attempts

## Monitoring and Analytics

### CloudWatch Metrics
- Extraction success/failure rates
- Processing latency
- Confidence score distributions
- Source attribution statistics

### Alerts
- High failure rates
- Processing timeouts
- Low confidence scores

## API Endpoints

### Manual Metadata Extraction
```
POST /books/{bookId}/extract-metadata
Authorization: Bearer <jwt-token>

Response:
{
  "success": true,
  "data": {
    "bookId": "book-123",
    "status": "processing",
    "message": "Metadata extraction initiated"
  }
}
```

## Error Handling

### Graceful Degradation
- Failed OCR extraction → Falls back to filename parsing
- Failed catalog lookup → Uses OCR-only metadata
- Partial failures → Stores available metadata with lower confidence

### Dead Letter Queue
- Failed events are sent to DLQ for analysis
- Manual reprocessing capabilities
- Error categorization and trending

## Future Enhancements

### Advanced Image Processing
- Deskewing and straightening
- Noise reduction
- Contrast enhancement
- Multiple image format support

### Enhanced OCR
- Multiple OCR engines for comparison
- Specialized book cover recognition
- Layout analysis for better parsing

### Vision LLM Integration
- OpenAI Vision API for advanced parsing
- Claude Vision for alternative analysis
- Custom prompt engineering for book covers

### Barcode Detection
- UPC/EAN/ISBN barcode scanning
- Fast catalog lookup via barcode
- Improved accuracy for ISBN-13/ISBN-10

### Machine Learning
- Custom models for book cover recognition
- Confidence score optimization
- Automated quality assessment

### Human-in-the-Loop
- Low confidence alerts for manual review
- Admin interface for corrections
- Feedback loop for model improvement

## Testing

### Unit Tests
- Handler logic testing
- Metadata parsing validation
- Error condition handling

### Integration Tests
- End-to-end pipeline testing
- EventBridge event flow
- Database integration

### Performance Tests
- Load testing with multiple concurrent extractions
- Memory usage optimization
- Processing time benchmarks

## Deployment

### Infrastructure
- Serverless Framework deployment
- AWS Lambda functions
- EventBridge rules and targets
- DynamoDB table updates

### Environment Variables
- `EVENT_BUS_NAME`: EventBridge bus name (default: 'default')
- `EVENT_BUS_SOURCE`: Event source identifier (default: 'bookclub.app')
- `VISION_LLM_PROVIDER`: LLM provider ('openai' or 'anthropic')
- `OPENAI_API_KEY`: OpenAI Vision API access key (optional - falls back to mock)
- `ANTHROPIC_API_KEY`: Anthropic Claude Vision API key (optional - falls back to mock)

**Important**: All vision services gracefully degrade to mock responses when API keys are not configured, ensuring the pipeline continues to function for testing and development.

### Security
- IAM roles and policies
- API Gateway authorization
- S3 bucket access controls
- Lambda execution permissions

## Troubleshooting

### Common Issues
1. **EventBridge event not triggering**: Check event pattern matching
2. **Textract failures**: Verify image format and S3 permissions
3. **Catalog lookup timeouts**: Implement proper retry logic
4. **Memory issues**: Adjust Lambda memory allocation

### Debug Tools
- CloudWatch logs for detailed tracing
- EventBridge event replay for testing
- Lambda function metrics and alerts
- DynamoDB table inspection tools