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

## Workflow Steps

### Step 1: Initialize Git Branch (Use `branch_workflow` Skill)
Before adding any files or configurations, checkout a clean branch off the latest release:
1. Trigger the **[branch_workflow](file:///Users/maddy/.gemini/config/skills/git/branch_workflow/SKILL.md)** skill to pull remote updates and checkout a descriptive feature/bugfix branch.

---

### Step 2: Configure the Lambda in `serverless.yml`
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

---

### Step 3: Implement the Lambda Handler
Create the file at `bookclub-app/backend/src/handlers/<domain>/<action>.js`. Wrap the handler in the standard `withErrorHandler` middleware and use the predefined response utility:

```javascript
const response = require('../../lib/response');
const <Domain>Service = require('../../services/<domain>-service');
const { withErrorHandler } = require('../../lib/middleware');

const handler = async (event) => {
  const { paramId } = event.pathParameters || {};
  let body = {};
  if (event.body) {
    body = JSON.parse(event.body);
  }

  if (!paramId) {
    return response.validationError({ paramId: 'Parameter is required' });
  }

  const result = await <Domain>Service.execute(paramId, body);
  return response.success(result);
};

module.exports.handler = withErrorHandler(handler);
```

---

### Step 4: Extend Services and Models
Integrate data processing logic and database interactions:
1. **Service Layer (`src/services/<domain>-service.js`)**: Contain business logic and call model methods.
2. **Model Layer (`src/models/<domain>.js`)**: Handle DynamoDB database queries.

---

### Step 5: Write Handler Unit Tests (Use `add_tests` Skill)
Create a unit test suite to test your handler in isolation:
1. Follow the **[add_tests](file:///Users/maddy/.gemini/config/skills/quality/add_tests/SKILL.md)** skill to create a test file under `bookclub-app/backend/__tests__/unit/handlers/<domain>/<action>.test.js`.
2. Mock the service layer and assert success, missing parameters, and database error states.

---

### Step 6: Validate and Verify (Use `run_tests` Skill)
Ensure your changes do not introduce regressions:
1. Run backend unit tests and integrations using the **[run_tests](file:///Users/maddy/.gemini/config/skills/quality/run_tests/SKILL.md)** skill.
2. Test the API locally using `serverless-offline` (run `npm run dev`) and Curl commands.

---

### Step 7: Code Review & PR Preparation (Use `code_review` Skill)
Prior to committing and opening a Pull Request:
1. Trigger the **[code_review](file:///Users/maddy/.gemini/config/skills/quality/code_review/SKILL.md)** skill.
2. Verify code quality, check for leftover console logs, execute linting checks, and output a PR markdown summary.

## Evals

To evaluate whether this skill was executed correctly:
1. Verify the Lambda configuration in `serverless.yml` has the correct `handler` path, method, path, and authorizer block.
2. Confirm the handler file imports `response`, `withErrorHandler`, and correctly wraps the handler.
3. Verify that the unit test file executes and passes with `npm test`.
