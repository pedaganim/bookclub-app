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

exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log('Event:', JSON.stringify(event, null, 2));
  const { RequestType, ResourceProperties } = event;
  const FunctionName = ResourceProperties.FunctionName;
  const EventSourceArn = ResourceProperties.EventSourceArn;

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
    const res = await lambda.listEventSourceMappings({ FunctionName }).promise();
    const mappings = (res.EventSourceMappings || []).filter(m => !EventSourceArn || m.EventSourceArn === EventSourceArn);

    // Enable any disabled mappings
    let updated = 0;
    for (const m of mappings) {
      const state = (m.State || '').toLowerCase();
      if (state !== 'enabled') {
        await lambda.updateEventSourceMapping({ UUID: m.UUID, Enabled: true }).promise();
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
