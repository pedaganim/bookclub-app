const AWS = require('./aws-config');

const eventBridge = new AWS.EventBridge();
const EVENT_SOURCE = process.env.EVENT_BUS_SOURCE || 'bookclub.app';

/**
 * Publish an application event to EventBridge
 * @param {string} detailType - e.g. 'Book.TextractCompleted'
 * @param {object} detail - detail payload
 */
async function publishEvent(detailType, detail) {
  const params = {
    Entries: [
      {
        Source: EVENT_SOURCE,
        DetailType: detailType,
        Detail: JSON.stringify(detail || {}),
        EventBusName: process.env.EVENT_BUS_NAME || 'default',
      },
    ],
  };
  await eventBridge.putEvents(params).promise();
}

module.exports = { publishEvent };
