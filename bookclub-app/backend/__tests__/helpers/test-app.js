const express = require('express');
const { handler: loginHandler } = require('../../src/handlers/users/login');
const { handler: registerHandler } = require('../../src/handlers/users/register-local');
const { handler: createBookHandler } = require('../../src/handlers/books/create');
const { handler: metadataHandler } = require('../../src/handlers/books/metadata');
const { handler: ocrMetadataHandler } = require('../../src/handlers/books/ocr-metadata');

// Create Express app that mimics API Gateway for testing
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Helper to convert serverless handler to Express middleware
  const wrapHandler = (handler) => {
    return async (req, res) => {
      const event = {
        body: req.body ? JSON.stringify(req.body) : null,
        headers: req.headers,
        pathParameters: req.params,
        queryStringParameters: req.query,
        httpMethod: req.method,
        path: req.path,
        requestContext: {
          authorizer: {
            claims: {
              sub: 'test-user-id' // Mock user ID for tests
            }
          }
        }
      };
      
      try {
        const result = await handler(event);
        res.status(result.statusCode);
        
        if (result.headers) {
          Object.keys(result.headers).forEach(key => {
            res.set(key, result.headers[key]);
          });
        }
        
        res.json(JSON.parse(result.body));
      } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  };

  // Define routes
  app.post('/auth/login', wrapHandler(loginHandler));
  app.post('/auth/register', wrapHandler(registerHandler));
  app.post('/books', wrapHandler(createBookHandler));
  app.get('/books/metadata', wrapHandler(metadataHandler));
  app.post('/books/ocr-metadata', wrapHandler(ocrMetadataHandler));

  return app;
}

module.exports = { testApp: createTestApp };