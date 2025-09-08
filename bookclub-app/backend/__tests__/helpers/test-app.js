const express = require('express');
const { handler: loginHandler } = require('../../src/handlers/users/login');
const { handler: registerHandler } = require('../../src/handlers/users/register-local');

// Create Express app that mimics API Gateway for testing
const app = express();
app.use(express.json());

// Helper to convert serverless handler to Express middleware
const wrapHandler = (handler) => {
  return async (req, res) => {
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      pathParameters: req.params,
      queryStringParameters: req.query,
      httpMethod: req.method,
      path: req.path,
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

module.exports = app;