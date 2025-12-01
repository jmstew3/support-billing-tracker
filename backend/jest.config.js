/** @type {import('jest').Config} */
export default {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Enable ESM support
  transform: {},

  // Look for test files in __tests__ directories or *.test.js files
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],

  // Ignore node_modules
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds (starting low, can increase over time)
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },

  // Verbose output
  verbose: true,

  // Set timeout for async tests
  testTimeout: 10000,

  // Setup file for global test configuration
  setupFilesAfterEnv: ['./test/setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node']
};
