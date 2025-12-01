/**
 * Jest Test Setup
 *
 * Global configuration and utilities for all tests.
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  /**
   * Generate a mock JWT token for testing
   */
  generateTestToken: () => {
    return jwt.sign(
      { id: 1, email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  /**
   * Create a mock request object
   */
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  }),

  /**
   * Create a mock response object
   */
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  }
};

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn
  };
}
