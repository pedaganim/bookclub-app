const { analyzeLostFoundImage } = require('../../lib/bedrock-analyzer');
const LostFound = require('../../models/lost-found');
const { publishEvent } = require('../../lib/event-bus');

exports.handler = async (event) => {
  try {
    if (!Array.isArray(event.Records)) {
      console.warn('[LostFoundBedrockWorker] No SQS records');
      return { ok: true };
    }

    for (const record of event.Records) {
      let payload;
      try {
        payload = JSON.parse(record.body || '{}');
      } catch (_) {
        console.warn('[LostFoundBedrockWorker] Invalid JSON body in SQS message');
        continue;
      }

      // We expect the payload from EventBridge -> SQS.
      // EventBridge wraps the event detail in a 'detail' object.
      const detail = payload.detail || payload;
      
      const { lostFoundId, userId, images } = detail;
      if (!lostFoundId || !images || !images.length) {
        console.warn('[LostFoundBedrockWorker] Missing lostFoundId or images array');
        continue;
      }

      // Just grab the first image URL
      const imageUrl = images[0];
      let bucket, key;

      try {
        const url = new URL(imageUrl);
        const hostMatch = url.hostname.match(/^(.*)\.s3\.amazonaws\.com$/);
        if (hostMatch && hostMatch[1]) {
          bucket = hostMatch[1];
          key = decodeURIComponent(url.pathname.replace(/^\//, ''));
        }
      } catch (e) {
        console.warn(`[LostFoundBedrockWorker] Could not parse S3 URL: ${imageUrl}`);
        continue;
      }

      if (!bucket || !key) {
        console.warn(`[LostFoundBedrockWorker] Could not determine S3 bucket/key from: ${imageUrl}`);
        continue;
      }

      // Add small delay to avoid overwhelming Bedrock
      const baseDelayMs = parseInt(process.env.BEDROCK_PRE_DELAY_MS || '400', 10);
      const jitterMs = Math.floor(Math.random() * (parseInt(process.env.BEDROCK_PRE_DELAY_JITTER_MS || '400', 10)));
      await new Promise(r => setTimeout(r, baseDelayMs + jitterMs));

      console.log(`[LostFoundBedrockWorker] Analyzing image for lostFoundId=${lostFoundId} from s3://${bucket}/${key}`);

      try {
        const metadata = await analyzeLostFoundImage({ bucket, key, contentType: 'image/jpeg' });

        if (metadata.itemType === 'person_error') {
          console.warn(`[LostFoundBedrockWorker] PERSON DETECTED for item ${lostFoundId}. Deleting item.`);
          await LostFound.delete(lostFoundId, userId, 'admin');
          continue; // Move to next record
        }

        const existing = await LostFound.getById(lostFoundId);
        if (!existing) {
          console.warn(`[LostFoundBedrockWorker] Item ${lostFoundId} no longer exists. Skipping update.`);
          continue;
        }

        // Only overwrite fields if they were generic/default or if the user relied on AI
        const patch = { aiProcessed: true };
        
        // If the user's title is very short or generic (like 'Unknown' or 'Found Item'), override it.
        // Or we just overwrite it. Per implementation plan: respect user input if it looks like they typed it.
        if (!existing.title || existing.title.toLowerCase().includes('unknown') || existing.title.toLowerCase().includes('found')) {
           if (metadata.title) patch.title = metadata.title;
        }

        if (!existing.description || existing.description.trim() === '') {
           if (metadata.description) patch.description = metadata.description;
        }

        if (!existing.itemType || existing.itemType === 'other') {
           if (metadata.itemType && metadata.itemType !== 'other') patch.itemType = metadata.itemType;
        }

        if (!existing.foundLocation || existing.foundLocation.trim() === '') {
           if (metadata.foundLocation) patch.foundLocation = metadata.foundLocation;
        }

        await LostFound.update(lostFoundId, userId, patch, 'admin');
        console.log(`[LostFoundBedrockWorker] Successfully enriched item ${lostFoundId}`);

        if (process.env.EVENT_BUS_NAME && process.env.EVENT_BUS_SOURCE) {
          await publishEvent('LostFound.ImageAnalysisCompleted', {
            lostFoundId,
            userId,
            metadata
          });
        }
      } catch (e) {
        console.warn(`[LostFoundBedrockWorker] Failed to analyze item ${lostFoundId}:`, e.message);
      }
    }
    return { ok: true };
  } catch (err) {
    console.error('[LostFoundBedrockWorker] Fatal Error:', err);
    throw err;
  }
};
