#!/usr/bin/env node
/*
Simple DLQ replay script for Bedrock Analyze worker.

Usage:
  BEDROCK_ANALYZE_DLQ_URL=<dlq-url> BEDROCK_ANALYZE_QUEUE_URL=<queue-url> node scripts/replay-bedrock-dlq.js [--max=N] [--dry]

Notes:
- Requires AWS credentials and region in environment.
- Replays messages from DLQ to main queue, deleting from DLQ on success.
*/
const AWS = require('aws-sdk');

const dlqUrl = process.env.BEDROCK_ANALYZE_DLQ_URL;
const mainQueueUrl = process.env.BEDROCK_ANALYZE_QUEUE_URL;
const maxArg = process.argv.find(a => a.startsWith('--max='));
const dryRun = process.argv.includes('--dry');
const maxCount = maxArg ? parseInt(maxArg.split('=')[1], 10) : 50;

if (!dlqUrl) {
  console.error('Error: BEDROCK_ANALYZE_DLQ_URL env var is required');
  process.exit(1);
}
if (!mainQueueUrl && !dryRun) {
  console.error('Error: BEDROCK_ANALYZE_QUEUE_URL env var is required unless --dry');
  process.exit(1);
}

const sqs = new AWS.SQS();

async function receiveBatch(maxMessages = 10, waitTimeSeconds = 2) {
  const res = await sqs.receiveMessage({
    QueueUrl: dlqUrl,
    MaxNumberOfMessages: Math.min(10, maxMessages),
    WaitTimeSeconds: waitTimeSeconds,
    VisibilityTimeout: 30,
    MessageAttributeNames: ['All'],
    AttributeNames: ['All'],
  }).promise();
  return res.Messages || [];
}

async function sendToMain(message) {
  if (dryRun) return;
  await sqs.sendMessage({
    QueueUrl: mainQueueUrl,
    MessageBody: message.Body,
    MessageAttributes: message.MessageAttributes,
  }).promise();
}

async function deleteFromDLQ(message) {
  await sqs.deleteMessage({
    QueueUrl: dlqUrl,
    ReceiptHandle: message.ReceiptHandle,
  }).promise();
}

(async () => {
  let processed = 0;
  console.log(`[DLQ Replay] Starting. DLQ=${dlqUrl} -> Main=${mainQueueUrl || '(dry-run)'} Max=${maxCount}`);
  while (processed < maxCount) {
    const remaining = maxCount - processed;
    const batch = await receiveBatch(Math.min(remaining, 10));
    if (batch.length === 0) {
      console.log('[DLQ Replay] No more messages to process.');
      break;
    }
    for (const msg of batch) {
      try {
        const preview = (msg.Body || '').slice(0, 200);
        console.log(`[DLQ Replay] Replaying message ${processed + 1}/${maxCount}: ${preview}`);
        await sendToMain(msg);
        await deleteFromDLQ(msg);
        processed += 1;
        if (processed >= maxCount) break;
      } catch (e) {
        console.error('[DLQ Replay] Failed to replay message:', e.message);
        // Do not delete from DLQ on failure; move on to next
      }
    }
  }
  console.log(`[DLQ Replay] Done. Processed=${processed}${dryRun ? ' (dry-run)' : ''}`);
})().catch(err => {
  console.error('[DLQ Replay] Fatal error:', err);
  process.exit(1);
});
