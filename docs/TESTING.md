# Testing Guide

## Overview

This project uses Jest for backend testing with ESM module support. The testing infrastructure is designed for unit tests with mocked dependencies.

## Backend Testing

### Configuration

**Jest Config** (`backend/jest.config.js`):
```javascript
export default {
  testEnvironment: 'node',
  transform: {},  // ESM, no transform needed
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['./test/setup.js']
};
```

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- routes/__tests__/requests.test.js

# Run tests matching pattern
npm test -- --testPathPattern=auth

# Watch mode (for development)
npm test -- --watch

# Verbose output
npm test -- --verbose
```

### Test Setup

**Setup File** (`backend/test/setup.js`):
```javascript
// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  generateTestToken: () => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 1, email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  }),

  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  }
};
```

### Writing Tests

#### Unit Test Structure

```javascript
// backend/routes/__tests__/myRoute.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before imports
const mockExecute = jest.fn();
const mockQuery = jest.fn();
const mockPool = {
  execute: mockExecute,
  query: mockQuery,
  getConnection: jest.fn()
};

jest.unstable_mockModule('../../db/config.js', () => ({
  default: mockPool
}));

describe('My Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/endpoint', () => {
    it('should return data successfully', async () => {
      // Arrange
      mockExecute.mockResolvedValueOnce([[{ id: 1, name: 'Test' }]]);

      // Act
      const { default: router } = await import('../../myRoute.js');

      // Assert
      expect(router).toBeDefined();
    });

    it('should handle errors', async () => {
      // Arrange
      mockExecute.mockRejectedValueOnce(new Error('DB Error'));

      // Assert
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
```

#### Testing with Mocked Database

```javascript
// Mock database responses
const mockRows = [
  {
    id: 1,
    date: new Date('2025-01-15'),
    time: '09:30:00',
    category: 'Support',
    status: 'active'
  }
];

mockExecute.mockResolvedValueOnce([mockRows]);
```

#### Testing Pagination

```javascript
describe('Pagination', () => {
  it('should calculate pagination metadata correctly', () => {
    const total = 100;
    const limit = 20;
    const offset = 40;

    const pagination = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };

    expect(pagination.hasMore).toBe(true);
    expect(pagination.currentPage).toBe(3);
    expect(pagination.totalPages).toBe(5);
  });
});
```

#### Testing Data Transformation

```javascript
describe('Data Transformation', () => {
  it('should transform database row to frontend format', () => {
    const dbRow = {
      id: 1,
      date: new Date('2025-01-15'),
      time: '09:30:00',
      estimated_hours: '0.50'
    };

    const transformed = {
      id: dbRow.id,
      Date: dbRow.date.toISOString().split('T')[0],
      Time: dbRow.time,
      EstimatedHours: parseFloat(dbRow.estimated_hours)
    };

    expect(transformed.Date).toBe('2025-01-15');
    expect(transformed.EstimatedHours).toBe(0.5);
  });
});
```

### Test Organization

```
backend/
├── routes/
│   └── __tests__/
│       ├── requests.test.js
│       ├── auth.test.js
│       └── fluent-sync.test.js
├── services/
│   └── __tests__/
│       └── FluentSyncService.test.js
├── repositories/
│   └── __tests__/
│       ├── RequestRepository.test.js
│       └── FluentTicketRepository.test.js
└── test/
    └── setup.js
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage report is generated in `backend/coverage/` directory. Open `coverage/lcov-report/index.html` to view detailed report.

### Mocking Patterns

#### Mock Database Pool

```javascript
const mockPool = {
  execute: jest.fn(),
  query: jest.fn(),
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn(),
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
  })
};
```

#### Mock External APIs

```javascript
jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn()
    }))
  }
}));
```

#### Mock JWT

```javascript
jest.unstable_mockModule('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' })
}));
```

### Best Practices

1. **Isolate tests** - Each test should be independent
2. **Clear mocks** - Use `beforeEach(() => jest.clearAllMocks())`
3. **Test edge cases** - Empty arrays, null values, errors
4. **Use descriptive names** - `it('should return 404 when request not found')`
5. **Group related tests** - Use nested `describe` blocks
6. **Mock external dependencies** - Database, APIs, file system
7. **Test both success and failure paths**

### Integration Testing

For full integration tests, use Docker:

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

## Frontend Testing

Frontend testing can be added using Vitest (recommended for Vite projects):

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Add to `vite.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  }
});
```
