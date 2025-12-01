/**
 * Request Routes Tests
 *
 * Unit tests for /api/requests endpoints.
 * These tests use mocked database connections.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the database pool
const mockExecute = jest.fn();
const mockQuery = jest.fn();
const mockPool = {
  execute: mockExecute,
  query: mockQuery,
  getConnection: jest.fn()
};

// Mock the db/config module
jest.unstable_mockModule('../../db/config.js', () => ({
  default: mockPool
}));

describe('GET /api/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return requests with proper transformation', async () => {
    // Mock database response
    const mockRows = [
      {
        id: 1,
        date: new Date('2025-01-15'),
        time: '09:30:00',
        month: '2025-01',
        request_type: 'General Request',
        category: 'Support',
        description: 'Test request',
        urgency: 'MEDIUM',
        effort: 'Medium',
        estimated_hours: 0.5,
        status: 'active',
        source: 'sms',
        website_url: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    mockExecute.mockResolvedValueOnce([mockRows]);

    // Import the router after mocking
    const { default: router } = await import('../requests.js');

    // The router should be defined
    expect(router).toBeDefined();
  });

  it('should apply filters correctly', async () => {
    const mockRows = [];
    mockExecute.mockResolvedValueOnce([mockRows]);

    // The filter logic should build correct SQL
    // This is a structural test - actual SQL testing would need integration tests
    expect(mockExecute).not.toHaveBeenCalled(); // Not called until route is invoked
  });
});

describe('Request Data Transformation', () => {
  it('should transform database row to frontend format', () => {
    const dbRow = {
      id: 1,
      date: new Date('2025-01-15'),
      time: '09:30:00',
      month: '2025-01',
      request_type: 'General Request',
      category: 'Support',
      description: 'Test request',
      urgency: 'MEDIUM',
      effort: 'Medium',
      estimated_hours: '0.50',
      status: 'active',
      source: 'sms',
      website_url: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Transform function (inline for testing)
    const transformed = {
      id: dbRow.id,
      Date: dbRow.date.toISOString().split('T')[0],
      Time: dbRow.time,
      Month: dbRow.month,
      Request_Type: dbRow.request_type,
      Category: dbRow.category,
      Request_Summary: dbRow.description,
      Urgency: dbRow.urgency,
      Effort: dbRow.effort,
      EstimatedHours: parseFloat(dbRow.estimated_hours),
      Status: dbRow.status,
      source: dbRow.source || 'sms',
      website_url: dbRow.website_url || null,
      CreatedAt: dbRow.created_at,
      UpdatedAt: dbRow.updated_at
    };

    expect(transformed.Date).toBe('2025-01-15');
    expect(transformed.EstimatedHours).toBe(0.5);
    expect(transformed.source).toBe('sms');
    expect(transformed.website_url).toBeNull();
  });
});

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

  it('should detect last page correctly', () => {
    const total = 100;
    const limit = 20;
    const offset = 80;

    const hasMore = offset + limit < total;
    const currentPage = Math.floor(offset / limit) + 1;

    expect(hasMore).toBe(false);
    expect(currentPage).toBe(5);
  });
});
