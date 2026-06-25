---
name: add_backend_endpoint
description: Detailed guidelines and specific architectural patterns to add a new API Gateway/Lambda endpoint in the BookClub backend.
triggers:
  - user_intent: "add a new backend endpoint"
  - user_intent: "create a new API route"
  - user_intent: "add a Lambda handler"
  - file_change: "bookclub-app/backend/serverless.yml"
  - file_change: "bookclub-app/backend/src/handlers/**/*.js"
evals:
  - check: "the function configuration is defined in serverless.yml under functions:"
  - check: "the handler file exists at the specified path and uses the withErrorHandler middleware"
  - check: "a unit test file exists under __tests__/unit/handlers/ and passes successfully"
---

# Add Backend Endpoint

Use this skill when you need to add a new API endpoint or event handler to the backend. This project is built on **Node.js (v18.x)**, **Serverless Framework**, **AWS Lambda**, **DynamoDB**, and **Cognito**.

## When to Use This Skill

- Use this whenever a new backend API feature or route is requested.
- Use this when modifying backend routing rules.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"add endpoint"`, `"create lambda"`, `"new api route"`, `"new handler"`, `"add API"`, or `"add backend route"`.
2. A file is created or modified under `bookclub-app/backend/src/handlers/`.
3. `bookclub-app/backend/serverless.yml` functions block is modified.

## Workflow Steps

### Step 1: Configure the Lambda in `serverless.yml`
Open `bookclub-app/backend/serverless.yml` and declare the new function under the `functions:` block. Use the following structure:

```yaml
  <functionName>:
    handler: src/handlers/<domain>/<action>.handler
    events:
      - http:
          method: <GET|POST|PUT|DELETE|PATCH>
          path: /<path-route>
          cors:
            origin: '*'
            headers:
              - Content-Type
              - Authorization
              - X-Access-Token
              - X-Amz-Date
              - X-Api-Key
              - X-Amz-Security-Token
          # Include authorizer if endpoint requires authentication
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId:
              Ref: ApiGatewayAuthorizer
```

*Note: If the endpoint is unauthenticated, omit the `authorizer` key (similar to `loginUser` or `registerUser`).*

---

### Step 2: Implement the Lambda Handler
Create the file at `bookclub-app/backend/src/handlers/<domain>/<action>.js`. Wrap the handler in the standard `withErrorHandler` middleware and use the predefined response utility:

```javascript
const response = require('../../lib/response');
// Import corresponding service
const <Domain>Service = require('../../services/<domain>-service');
const { withErrorHandler } = require('../../lib/middleware');

/**
 * Handler for <Endpoint Description>
 */
const handler = async (event) => {
  // 1. Parameter extraction (from body, pathParameters, or queryStringParameters)
  const { <param1> } = event.pathParameters || {};
  let body = {};
  if (event.body) {
    body = JSON.parse(event.body);
  }

  // 2. Validation
  if (!<param1>) {
    return response.validationError({ <param1>: '<param1> is required' });
  }

  // 3. Service Invocation
  const result = await <Domain>Service.<methodName>(<param1>, body);

  // 4. Return success response
  return response.success(result);
};

module.exports.handler = withErrorHandler(handler);
```

---

### Step 3: Extend Services and Models
Integrate data processing logic and database interactions:
1. **Service Layer (`src/services/<domain>-service.js`)**: Contain business logic, construct inputs, format outputs, and call model methods.
2. **Model Layer (`src/models/<domain>.js`)**: Handle DynamoDB database queries. Note that local runs write mock database files to `backend/.local-storage/`.
   - Query: `await DynamoDB.query(...)`
   - Put: `await DynamoDB.put(...)`
   - Update: `await DynamoDB.update(...)`

---

### Step 4: Write Jest Handler Unit Tests
Create a test file at `bookclub-app/backend/__tests__/unit/handlers/<domain>/<action>.test.js`. Mock the service layer to isolate handler logic:

```javascript
const { handler } = require('../../../../src/handlers/<domain>/<action>');
const <Domain>Service = require('../../../../src/services/<domain>-service');

jest.mock('../../../../src/services/<domain>-service');

describe('<action> handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and data on success', async () => {
    const mockResult = { success: true };
    <Domain>Service.<methodName>.mockResolvedValue(mockResult);

    const event = {
      pathParameters: { <param1>: 'value123' },
      body: JSON.stringify({ key: 'val' })
    };

    const result = await handler(event);

    expect(<Domain>Service.<methodName>).toHaveBeenCalledWith('value123', { key: 'val' });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data).toEqual(mockResult);
  });

  it('should return 400 validation error if parameter is missing', async () => {
    const event = { pathParameters: {} };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });
});
```

---

### Step 5: Test Locally
1. Run backend unit tests:
   ```bash
   cd bookclub-app/backend && npm test
   ```
2. Start the Serverless Offline local development server (port 4000):
   ```bash
   cd bookclub-app/backend && npm run dev
   ```
3. Send a request to the local API endpoint (e.g. using `curl`):
   ```bash
   curl -X POST http://localhost:4000/dev/<route> -H "Content-Type: application/json" -d '{"key": "val"}'
   ```

## Evals

To evaluate whether this skill was executed correctly:
1. Verify the Lambda configuration in `serverless.yml` has the correct `handler` path, method, path, and authorizer block.
2. Confirm the handler file imports `response`, `withErrorHandler`, and correctly wraps the handler.
3. Verify that the unit test file executes and passes with `npm test`.
