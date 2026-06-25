---
name: run_tests
description: Runs unit and integration tests across backend and frontend code to verify changes.
triggers:
  - user_intent: "run tests"
  - user_intent: "execute test suite"
  - user_intent: "check if tests pass"
  - command: "npm test"
  - post_action: "file_modification"
evals:
  - check: "npm test output contains test summary of suites and passes successfully (exits with code 0)"
---

# Run Tests

Use this skill once you have completed making code changes, and before creating a pull request or declaring a task finished.

## When to Use This Skill

- **MUST use** after modifying any source files.
- **MUST use** as part of the verification step in your implementation plan.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"run tests"`, `"execute test suite"`, or `"check if tests pass"`.
2. A task execution reaches the verification phase after code modifications.
3. The command `npm test` or `npm run test` is proposed or run.

## Steps

### Step 1: Detect Affected Projects
Determine whether your changes affect the backend (`bookclub-app/backend/`), the frontend (`bookclub-app/frontend/`), or both.

### Step 2: Execute Backend Tests
If the backend is affected:
1. Navigate to the backend directory:
   `cd bookclub-app/backend`
2. Run the test suite:
   ```bash
   npm test
   ```
3. Verify that all tests pass. If any tests fail, debug the changes and run the tests again.

### Step 3: Execute Frontend Tests
If the frontend is affected:
1. Navigate to the frontend directory:
   `cd bookclub-app/frontend`
2. Run the test suite:
   ```bash
   npm test
   ```
3. Verify that all tests pass. If any tests fail, debug the changes and run the tests again.

### Step 4: Report Results
Summarize which tests were executed and whether they passed. Include test coverage metrics if available in the test output.

## Evals

To evaluate whether this skill was executed correctly:
1. Confirm that the test suite ran to completion (check stdout/stderr logs for test runner exits).
2. Verify that the output shows `0` failures and details the test suites run.
