# Testing Documentation

This document outlines the comprehensive testing strategy for the BookClub application.

## Overview

The testing infrastructure includes:
- **Unit Tests**: Testing individual functions and components in isolation
- **Integration Tests**: Testing API endpoints and service interactions
- **End-to-End Tests**: Testing complete user workflows
- **CI/CD Pipeline**: Automated testing on every push/PR

## Test Structure

```
bookclub-app/
├── backend/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── lib/
│   │   │   │   └── local-storage.test.js
│   │   │   └── models/
│   │   │       └── user.test.js
│   │   ├── integration/
│   │   │   └── auth.test.js
│   │   └── helpers/
│   │       └── test-app.js
│   └── package.json (with Jest configuration)
├── frontend/
│   ├── src/
│   │   └── __tests__/
│   │       ├── services/
│   │       │   └── api.test.ts
│   │       └── utils/
│   │           └── pkce.test.ts
│   ├── tests/
│   │   └── e2e/
│   │       ├── basic-navigation.spec.ts
│   │       └── auth-flow.spec.ts
│   ├── playwright.config.ts
│   └── package.json
├── tests/ (shared test structure)
└── .github/workflows/test.yml
```

## Backend Testing

### Framework: Jest + Supertest
- **Unit Tests**: 25 tests covering models and utilities
- **Integration Tests**: 9 tests covering authentication endpoints

### Key Features:
- Mock implementations for both offline (LocalStorage) and online (DynamoDB) modes
- Express wrapper for testing serverless handlers
- Comprehensive coverage of User model and LocalStorage utility
- Authentication flow testing (register/login)

### Running Backend Tests:
```bash
cd bookclub-app/backend

# Run all tests
npm test

# Run specific test types
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage:
- User model: Registration, login, profile management, Cognito integration
- LocalStorage: File operations, user CRUD, book CRUD
- API handlers: Authentication endpoints with validation

## Frontend Testing

### Framework: React Testing Library + Jest
- **Unit Tests**: 17 tests covering utilities and service logic
- **E2E Tests**: Playwright tests for user workflows

### Key Features:
- Mock localStorage and crypto APIs
- PKCE utility testing for OAuth flows
- API service configuration testing
- Component testing with mocked dependencies

### Running Frontend Tests:
```bash
cd bookclub-app/frontend

# Run unit tests
npm test

# Run E2E tests (requires backend running)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

### Test Coverage:
- PKCE utilities: Code generation, challenge creation, base64 encoding
- API service: Token handling, request configuration, error handling
- Components: Basic rendering and interaction tests

## End-to-End Testing

### Framework: Playwright
- **Browser Coverage**: Chromium, Firefox, WebKit
- **Test Scenarios**: Authentication flows, navigation, form validation

### Key Features:
- API mocking for consistent test environments
- Cross-browser testing
- Visual testing capabilities
- Failed test artifacts collection

### E2E Test Scenarios:
1. **Basic Navigation**:
   - Homepage loading and redirects
   - Login/register page accessibility
   - Inter-page navigation

2. **Authentication Flow**:
   - User registration with validation
   - Login with credentials
   - Error handling for invalid inputs
   - Form validation testing

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline includes multiple jobs:

1. **Backend Tests**: Unit and integration tests
2. **Frontend Tests**: Unit tests with coverage
3. **E2E Tests**: Full application testing
4. **Security Scan**: Dependency vulnerability checks
5. **Lint and Format**: Code quality checks
6. **Test Matrix**: Multi-version Node.js testing

### Workflow Triggers:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Artifacts:
- Test coverage reports
- E2E test failure reports
- Playwright HTML reports

## Test Execution Guide

### Local Development:
```bash
# Backend tests
cd bookclub-app/backend
npm test

# Frontend tests
cd bookclub-app/frontend
npm test

# E2E tests (requires both servers running)
# Terminal 1:
cd bookclub-app/backend && npm run offline

# Terminal 2:
cd bookclub-app/frontend && npm start

# Terminal 3:
cd bookclub-app/frontend && npm run test:e2e
```

### Production Testing:
```bash
# Full test suite
npm run test:all  # (if script is added)

# With coverage
npm run test:coverage
```

## Mock Strategy

### Backend:
- **LocalStorage**: File system operations mocked
- **DynamoDB**: AWS SDK operations mocked
- **Cognito**: Authentication service mocked
- **Environment**: Offline/online mode switching

### Frontend:
- **API calls**: Axios mocked for unit tests, route interception for E2E
- **LocalStorage**: Browser API mocked
- **Crypto APIs**: Web Crypto API mocked for PKCE testing
- **React Router**: Component mocking for isolated testing

## Best Practices

### Test Writing:
1. **Isolation**: Each test is independent
2. **Clarity**: Descriptive test names and assertions
3. **Coverage**: Critical business logic prioritized
4. **Maintainability**: DRY principles with shared test utilities

### Mock Management:
1. **Consistent**: Same mocking patterns across tests
2. **Realistic**: Mock data reflects real API responses
3. **Cleanup**: Proper teardown between tests

### CI/CD:
1. **Fast**: Parallel execution where possible
2. **Reliable**: Stable test environments
3. **Informative**: Clear failure reporting

## Future Enhancements

### Potential Additions:
1. **Visual Regression Testing**: Automated screenshot comparison
2. **Performance Testing**: Load testing for API endpoints
3. **Accessibility Testing**: A11y checks in E2E tests
4. **Database Testing**: Integration with real test databases
5. **Mobile Testing**: Device-specific E2E scenarios

### Monitoring:
1. **Test Metrics**: Track test execution times and flakiness
2. **Coverage Tracking**: Ensure coverage thresholds are maintained
3. **Failure Analysis**: Automated categorization of test failures

## Troubleshooting

### Common Issues:
1. **Timeout Errors**: Increase timeouts for async operations
2. **Module Resolution**: Check Jest configuration for TypeScript/ES modules
3. **Browser Installation**: Use `npx playwright install` for E2E tests
4. **Port Conflicts**: Ensure test servers use available ports

### Debug Commands:
```bash
# Verbose test output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="specific test name"

# E2E debug mode
npm run test:e2e -- --debug

# Playwright UI mode
npm run test:e2e:ui
```