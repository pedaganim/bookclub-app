const AWS = require('./aws-config');
const config = require('./config');
const logger = require('./logger');

const eventBridge = new AWS.EventBridge();
const EVENT_SOURCE = config.EVENT_BUS_SOURCE || 'bookclub.app';

/**
 * Publish an application event to EventBridge
 * @param {string} detailType - e.g. 'Book.TextractCompleted'
 * @param {object} detail - detail payload
 */
async function publishEvent(detailType, detail) {
  try {
    const params = {
      Entries: [
        {
          Source: EVENT_SOURCE,
          DetailType: detailType,
          Detail: JSON.stringify(detail || {}),
          EventBusName: config.EVENT_BUS_NAME || 'default',
        },
      ],
    };
    await eventBridge.putEvents(params).promise();
    logger.debug({ detailType }, 'Event published to EventBridge');
  } catch (error) {
    logger.error({ error, detailType }, 'Failed to publish event to EventBridge');
    throw error;
  }
}

module.exports = { publishEvent };
