---
name: add_tests
description: Guides the creation of new unit or integration tests for new features and bug fixes.
triggers:
  - user_intent: "add tests"
  - user_intent: "write test cases"
  - user_intent: "increase test coverage"
  - file_creation: "bookclub-app/backend/src/**/*.js"
  - file_creation: "bookclub-app/frontend/src/**/*.{ts,tsx}"
evals:
  - check: "a corresponding test file matching *.test.js or *.test.ts/tsx exists in the test/src directory"
  - check: "the test file imports the newly created module/component"
  - check: "the test suite passes with npm test"
---

# Add Tests

Use this skill when implementing a new feature, modifying existing logic, or fixing a bug. Ensuring that code changes are covered by tests prevents future regressions.

## When to Use This Skill

- Use this whenever a new function, API endpoint, custom hook, component, or utility is introduced.
- Use this when resolving a bug to write a regression test confirming the fix works.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"add tests"`, `"write test cases"`, or `"increase test coverage"`.
2. A new handler, service, model, helper, or frontend component file is created.
3. Regressions or bugs are resolved, prompting a test case to cover the resolved path.

## Steps

### Step 1: Identify Target Test Directories
Find where existing tests are located for the component you are modifying:
- **Backend Handlers/Helpers**: Located in `bookclub-app/backend/__tests__/unit/` or `bookclub-app/backend/__tests__/integration/`.
- **Frontend Components/Services**: Located alongside the source files in `bookclub-app/frontend/src/` (typically matching the naming pattern `*.test.tsx` or `*.test.ts`).

### Step 2: Choose Test Level
- **Unit Tests**: For pure logic, utility functions, state reducers, and independent React hooks. Mock any external HTTP calls or databases.
- **Integration Tests**: For Lambda handlers, Cognito integrations, and React components that interact with APIs/databases (using mock endpoints or local database simulators).

### Step 3: Implement the Tests
1. Follow the style and libraries used in existing tests (e.g. Jest, Testing Library).
2. Ensure you mock AWS SDK services or local storage mocks where appropriate to keep tests fast and independent of live resources.
3. Write clean test descriptions describing what is being tested (e.g., `should return 400 if title is missing`).

### Step 4: Run and Validate
1. Run the new tests to make sure they pass:
   `npm test`
2. Intentionally break the code temporarily to verify the test fails, then restore it. This ensures the test is actually validating the logic.

## Evals

To evaluate whether this skill was executed correctly:
1. Verify that a test file matching the name of the new module exists in the proper test folder structure.
2. Confirm the test file is run and yields successful passes under `npm test`.
