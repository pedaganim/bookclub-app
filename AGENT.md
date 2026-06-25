# BookClub Repository Guide

Welcome to the BookClub serverless book-sharing platform codebase. This guide details the overall architecture, tech stack, and primary developer workflows.

## 🌐 System Overview
BookClub is a serverless application enabling users to catalog their physical books, manage club collections, and share them with other members.
- **Frontend**: A single-page React application written in TypeScript.
- **Backend**: An AWS Lambda microservices architecture deployed using the Serverless Framework.
- **Infrastructure**: Configured both via Serverless YAML and Terraform IaC for DNS, SSL, S3 buckets, and DynamoDB.

## 🗂️ Project Structure
- `/bookclub-app/frontend/`: Frontend React codebase, assets, and UI tests.
- `/bookclub-app/backend/`: Backend AWS Lambda handler code, Bedrock integrations, and tests.
- `/bookclub-app/docs/`: In-depth specification and development guides.

## 🛠️ Root-Level CLI Command Reference

| Context | Purpose | Command |
|---------|---------|---------|
| **Backend** | Local Dev Server (port 4000) | `cd bookclub-app/backend && npm run dev` |
| **Backend** | Run Dev Server with Seeded Data | `cd bookclub-app/backend && npm run dev:seed` |
| **Backend** | Run Unit Tests | `cd bookclub-app/backend && npm test` |
| **Backend** | Deploy to AWS (dev stage) | `cd bookclub-app/backend && npm run deploy:dev` |
| **Frontend** | Start Local Web Server (port 3000) | `cd bookclub-app/frontend && npm start` |
| **Frontend** | Run Unit Tests | `cd bookclub-app/frontend && npm test` |
| **Frontend** | Run Code Linting | `cd bookclub-app/frontend && npm run lint` |
| **Automation** | Deploy Dev Backend + Frontend S3 | `cd bookclub-app && ./deploy-dev.sh` |

## 📉 Technical Debt & Migration Plans
- **Auth Local Mocking**: In local development (`offline` / `dev` scripts), authentication is bypassed and simulated via mock users. Always verify that real AWS Cognito flows work in staging (`dev` branch) before deploying to production.
- **Local Database Mocking**: Local runs write books data to JSON files in `backend/.local-storage/`. Do not commit this folder to version control.

## 🤖 AI Agent Guidelines & Workflows

To maintain repository quality, all AI agents (including Devin, Antigravity, Cursor, etc.) working on this codebase MUST follow these standardized guidelines:

### 1. Git Branching Workflow
- For any new task, always checkout a new branch off the latest from the `release` branch.
- Fetch and pull the remote `release` branch first:
  ```bash
  git checkout release && git pull origin release
  ```
  Then create your task branch:
  ```bash
  git checkout -b <branch-name>
  ```

### 2. Quality Assurance & Test Verification
- **Run tests**: Always run tests once changes are complete.
  - Backend: `npm test` under `bookclub-app/backend/`
  - Frontend: `npm test` under `bookclub-app/frontend/`
- **Add tests**: Always add unit/integration tests for new handlers, services, models, helpers, or frontend components where applicable (under `__tests__/` directories).
- **Code Review**: Run a code review checklist (syntax, unused console logs, clean logic, security, and passing tests) before declaring the task complete or creating a Pull Request.

### 3. Backend Route Additions
When adding a new API endpoint to the backend, adhere to the project architecture:
1. Define the routing and event structure under `functions:` in `bookclub-app/backend/serverless.yml`.
2. Implement the API handler inside `bookclub-app/backend/src/handlers/<resource>/<action>.js` using standard middlewares (e.g. `withErrorHandler`) and response helpers (e.g. `response.success`, `response.validationError`).
3. Integrate business logic in `src/services/` and database client logic in `src/models/` (DynamoDB).
4. Write a handler unit test under `bookclub-app/backend/__tests__/unit/handlers/<resource>/<action>.test.js` using Jest and service mocks.

### 4. Permissions Guard & Safeguards
- For "Bigger Changes" (e.g. editing `serverless.yml`, database schemas, Terraform configurations, deleting files, modifying package dependencies), the agent must create an implementation plan and explicitly request user permission before editing.
- For simple bash/git command executions, recommend using fast/cost-efficient models (e.g. Gemini 3.5 Flash) to optimize token costs.
