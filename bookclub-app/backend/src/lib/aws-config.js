const AWS = require('aws-sdk');

// Configure AWS for local development
if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
  // Use local configuration for offline development
  AWS.config.update({
    region: 'us-east-1',
    accessKeyId: 'local',
    secretAccessKey: 'local',
    dynamodbEndpoint: 'http://localhost:8000',
  });
}

module.exports = AWS;
