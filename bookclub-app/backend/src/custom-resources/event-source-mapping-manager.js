/*
 * Custom CloudFormation resource to ensure a Lambda Event Source Mapping is enabled.
 * Use this after resources that may temporarily disable or rotate stream ARNs
 * (e.g., DynamoDB Streams) to reassert Enabled=true.
 */
const AWS = require('aws-sdk');

const lambda = new AWS.Lambda();

async function sendResponse(event, context, status, data = {}, physicalResourceId) {
  const responseUrl = event.ResponseURL;
  const responseBody = JSON.stringify({
    Status: status,
    Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  });

  const https = require('https');
  const url = require('url');
  const parsedUrl = url.parse(responseUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: { 'content-type': '', 'content-length': responseBody.length },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      resolve();
    });
    req.on('error', reject);
    req.write(responseBody);
    req.end();
  });
}

// Simple retry with exponential backoff and jitter for throttled Lambda API calls
async function withRetry(fn, { maxAttempts = 8, baseMs = 300 } = {}) {
  let attempt = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const code = err && (err.code || err.name || '');
      const retryable = err && (err.retryable === true || code === 'TooManyRequestsException' || code === 'ThrottlingException' || code === 'Throttling');
      attempt += 1;
      if (!retryable || attempt >= maxAttempts) throw err;
      const backoff = baseMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 0.4 * backoff);
      const delay = Math.min(5000, Math.floor(0.8 * backoff) + jitter);
      // eslint-disable-next-line no-console
      console.warn(`Retrying after ${delay}ms due to ${code} (attempt ${attempt}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log('Event:', JSON.stringify(event, null, 2));
  const { RequestType, ResourceProperties } = event;
  const FunctionName = ResourceProperties.FunctionName;
  const EventSourceArn = ResourceProperties.EventSourceArn;
  const BatchSize = ResourceProperties.BatchSize || 10;
  const MaximumBatchingWindowInSeconds = ResourceProperties.MaximumBatchingWindowInSeconds || 5;
  const StartingPosition = ResourceProperties.StartingPosition || 'LATEST';

  if (!FunctionName) {
    await sendResponse(event, context, 'FAILED', { Error: 'Missing FunctionName' });
    return;
  }

  try {
    if (RequestType === 'Delete') {
      await sendResponse(event, context, 'SUCCESS', { FunctionName });
      return;
    }

    // Look up mappings for this function (and filter by EventSourceArn if provided)
    const res = await withRetry(() => lambda.listEventSourceMappings({ FunctionName }).promise());
    const mappings = (res.EventSourceMappings || []).filter(m => !EventSourceArn || m.EventSourceArn === EventSourceArn);

    // If no mapping exists, do not create here. CFN owns the EventSourceMapping resource.
    // Return success and rely on the CFN EventSourceMapping to be present.
    if (!mappings.length) {
      await sendResponse(event, context, 'SUCCESS', { FunctionName, MappingsFound: 0, Note: 'No mappings found; skipping create.' }, FunctionName);
      return;
    }

    // Enable any disabled mappings
    let updated = 0;
    for (const m of mappings) {
      const state = (m.State || '').toLowerCase();
      if (state !== 'enabled') {
        await withRetry(() => lambda.updateEventSourceMapping({ UUID: m.UUID, Enabled: true }).promise());
        updated += 1;
      }
    }

    await sendResponse(event, context, 'SUCCESS', { FunctionName, MappingsFound: mappings.length, MappingsEnabled: updated }, FunctionName);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error ensuring mapping enabled:', err);
    await sendResponse(event, context, 'FAILED', { Error: err.message });
  }
};
