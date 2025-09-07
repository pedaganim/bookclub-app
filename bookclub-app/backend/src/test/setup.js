// Test setup file for backend tests
process.env.NODE_ENV = 'test';
process.env.IS_OFFLINE = 'true';

// Mock AWS SDK
const mockDynamoDb = {
  put: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  deleteItem: jest.fn(),
  query: jest.fn(),
  generateUpdateExpression: jest.fn(),
};

const mockCognito = {
  signUp: jest.fn().mockReturnValue({ promise: jest.fn() }),
  adminConfirmSignUp: jest.fn().mockReturnValue({ promise: jest.fn() }),
  adminDeleteUser: jest.fn().mockReturnValue({ promise: jest.fn() }),
  initiateAuth: jest.fn().mockReturnValue({ promise: jest.fn() }),
  getUser: jest.fn().mockReturnValue({ promise: jest.fn() }),
};

// Mock modules
jest.mock('../lib/dynamodb', () => mockDynamoDb);
jest.mock('../lib/aws-config', () => ({
  CognitoIdentityServiceProvider: jest.fn(() => mockCognito),
}));
jest.mock('../lib/table-names', () => ({
  getTableName: jest.fn((name) => `test-${name}`),
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Export mocks for use in tests
global.mockDynamoDb = mockDynamoDb;
global.mockCognito = mockCognito;