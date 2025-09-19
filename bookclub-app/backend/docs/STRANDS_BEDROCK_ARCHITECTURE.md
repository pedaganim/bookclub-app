# Strands + Bedrock Architecture for Book Cover Analysis

## Goals
- Extract rich metadata from book cover images stored in S3 using Bedrock LLMs (Claude 3 family).
- Orchestrate via Strands-style Lambda workflow with clear events for downstream enrichment (Google Books).
- Provide fallbacks, clear logging, and operational guidance.

## Model Selection (Bedrock)
Evaluated candidates (image understanding):
- Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20240620-v1:0)
  - Best overall reasoning, robust JSON adherence with proper prompting, strong OCR on covers.
- Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)
  - Lower cost, good speed; acceptable quality for simpler covers.

Recommendation:
- Default to Claude 3.5 Sonnet for production quality. Allow override via `BEDROCK_MODEL_ID`.

## Workflow Overview
1. Client uploads cover image to S3 (bucket: `${service}-${stage}-book-covers`).
2. Strands analyzer Lambda (`bedrockAnalyzeCover`) fetches the image bytes from S3.
3. Lambda calls Bedrock runtime with the chosen model and an instruction prompt to produce STRICT JSON:
   - `title_candidates`, `author_candidates`, `categories`, `age_group`, `audience`, `themes`, `content_warnings`, `language_guess`.
4. Lambda optionally persists metadata to `Books` row when `bookId` is provided, under `mcp_metadata.bedrock`.
5. Lambda emits EventBridge event `Book.StrandsAnalyzedCompleted` with `{ bookId, bucket, key, metadata }`.
6. Existing `enrichGoogleMetadata` subscribes to this event and enriches fields via Google Books API.

## Implementation Details
- Handler: `src/handlers/strands/bedrockAnalyzeCover.js`
  - Accepts HTTP POST with `{ bucket, key, contentType?, bookId? }` or EventBridge `detail` payload.
  - Uses helper `src/lib/bedrock-analyzer.js` to invoke Bedrock (Claude 3) on the S3 image.
  - Writes `mcp_metadata.bedrock` when `bookId` present, and publishes `Book.StrandsAnalyzedCompleted`.

- Helper: `src/lib/bedrock-analyzer.js`
  - Downloads S3 object, base64-encodes image for Claude 3 content payload.
  - Invokes model with strict-JSON instruction and normalizes response.

- Serverless wiring: `backend/serverless.yml`
  - Env: `BEDROCK_MODEL_ID`, `SERVICE_NAME` included; reuses existing `BOOK_COVERS_BUCKET`, `EVENT_BUS_*`.
  - IAM: grants `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`.
  - Function: `bedrockAnalyzeCover` with HTTP endpoint `POST /strands/analyze-cover`.
  - Google enrichment now also listens to `Book.StrandsAnalyzedCompleted`.

## Error Handling & Fallbacks
- If Bedrock returns non-JSON text, we safely parse to empty object and proceed with normalization.
- If S3 fetch fails or Bedrock invocation errors, we return HTTP 500 for API calls and rethrow for EventBridge.
- Fallback model: set `BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0` for cost/speed sensitive workloads.

## Observability
- CloudWatch logs for `bedrockAnalyzeCover` include error traces.
- EventBridge events can be inspected via the bus `${EVENT_BUS_NAME}`.

## Configuration
Environment variables relevant:
- `BEDROCK_MODEL_ID` (default: Claude 3.5 Sonnet)
- `BOOK_COVERS_BUCKET` (already set by service)
- `EVENT_BUS_NAME`, `EVENT_BUS_SOURCE` (already present)
- `SERVICE_NAME`, `STAGE` provided by serverless

## Testing & Verification
- Unit tests pass for the backend after wiring; integration relies on existing Google and config tests.
- Manual smoke:
  - Invoke HTTP: `POST /strands/analyze-cover` with `{ "bucket": "${service}-${stage}-book-covers", "key": "book-covers/<your-key>.jpg", "bookId": "<id>" }`.
  - Check DynamoDB `Books` item for `mcp_metadata.bedrock`.
  - Confirm `Book.StrandsAnalyzedCompleted` triggers Google enrichment.

## Future Enhancements
- Add retry/backoff around Bedrock invocation for transient errors.
- Add configurable prompt with taxonomy normalization.
- Batch processing via EventBridge pipelines for bulk backfills.
