# Testing Documentation

This document outlines the comprehensive testing strategy for the BookClub application.

## Overview

The testing infrastructure includes:
- **Unit Tests**: Testing individual functions and components in isolation
- **Integration Tests**: Testing API endpoints and service interactions
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
│   └── package.json
└── .github/workflows/test.yml
```

## Backend Testing

### Framework: Jest + Supertest
- **Unit Tests**: 48 tests covering models, utilities, and handlers
- **Integration Tests**: 9 tests covering authentication endpoints

### Key Features:
- Mock implementations for both offline (LocalStorage) and online (DynamoDB) modes
- Express wrapper for testing serverless handlers
- Comprehensive coverage of User model and LocalStorage utility
- Authentication flow testing (register/login)
- **Coverage Thresholds**: Enforced minimum coverage (30% statements, 21% branches, 27% functions, 29% lines)

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

# Run with coverage and open report
npm run test:coverage:open

# Watch mode
npm run test:watch
```

### Test Coverage:
- User model: Registration, login, profile management, Cognito integration
- LocalStorage: File operations, user CRUD, book CRUD
- API handlers: Authentication endpoints with validation
- **Book handlers**: List and get operations with comprehensive test scenarios
- File upload: URL generation with proper validation

## Frontend Testing

### Framework: React Testing Library + Jest
- **Unit Tests**: 35 tests covering utilities, services, and components
- **Coverage Thresholds**: Enforced minimum coverage (21% statements, 20% branches, 18% functions, 21% lines)

### Key Features:
- Mock localStorage and crypto APIs
- PKCE utility testing for OAuth flows
- API service configuration testing
- Component testing with mocked dependencies
- **ESLint Integration**: Code quality enforcement with custom rules

### Running Frontend Tests:
```bash
cd bookclub-app/frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run with coverage and open report
npm run test:coverage:open

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix
```

### Test Coverage:
- PKCE utilities: Code generation, challenge creation, base64 encoding
- API service: Token handling, request configuration, error handling
- Components: Basic rendering and interaction tests
- **BookCard component**: User interactions, delete operations, error handling
- OCR Service: Image processing and text extraction

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline includes multiple jobs with quality gates:

1. **Backend Tests**: Unit and integration tests with coverage thresholds
2. **Frontend Tests**: Unit tests with coverage and ESLint validation
3. **Security Scan**: Dependency vulnerability checks (runs on all PRs)
4. **Lint and Format**: Code quality checks with ESLint enforcement
5. **Quality Gate**: Requires all previous jobs to pass

### Workflow Triggers:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Artifacts:
- Test coverage reports for both backend and frontend
- Coverage thresholds prevent regression

### Quality Gates:
- All tests must pass
- Coverage thresholds must be met
- ESLint checks must pass
- Security scans must complete without critical issues

## Test Execution Guide

### Local Development:
```bash
# Backend tests
cd bookclub-app/backend
npm test

# Frontend tests
cd bookclub-app/frontend
npm test
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
- **API calls**: Axios mocked for unit tests
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
3. **Accessibility Testing**: A11y checks in automated tests
4. **Database Testing**: Integration with real test databases
5. **Mobile Testing**: Device-specific responsive testing

### Monitoring:
1. **Test Metrics**: Track test execution times and flakiness
2. **Coverage Tracking**: Ensure coverage thresholds are maintained
3. **Failure Analysis**: Automated categorization of test failures

## Troubleshooting

### Common Issues:
1. **Timeout Errors**: Increase timeouts for async operations
2. **Module Resolution**: Check Jest configuration for TypeScript/ES modules
3. **Port Conflicts**: Ensure test servers use available ports

### Debug Commands:
```bash
# Verbose test output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="specific test name"
```