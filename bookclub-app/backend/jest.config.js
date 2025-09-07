module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/lib/aws-config.js', // Exclude AWS config
  ],
  testMatch: [
    '**/src/**/__tests__/**/*.js',
    '**/src/**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  testTimeout: 30000,
  verbose: true,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};