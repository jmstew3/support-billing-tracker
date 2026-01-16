-- Migration: Seed test client users for development/testing
-- Description: Creates test client and user for client portal testing
-- Run AFTER: 009_create_client_portal_tables.sql
-- Date: 2025-01-16
--
-- Test Credentials:
--   Email: john.smith@acmecorp.com
--   Password: testpass123

-- 1. Create test client (Acme Corp) if it doesn't exist
INSERT IGNORE INTO clients (fluent_customer_id, company_name, contact_email, is_active)
VALUES ('test-acme-001', 'Acme Corp', 'contact@acmecorp.com', TRUE);

-- 2. Create test client user (using subquery for client_id)
-- Password: testpass123 (bcrypt hash with 10 rounds)
INSERT INTO client_users (client_id, email, password_hash, name, is_active)
SELECT
  c.id,
  'john.smith@acmecorp.com',
  '$2b$10$D61aXccYv4PF.0N8oigvsOeBTRQZYIMNsHq6d1exKWnsGnYQ5vB0y',
  'John Smith',
  TRUE
FROM clients c
WHERE c.fluent_customer_id = 'test-acme-001'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Report results
SELECT
  'Test client user seeded' as status,
  c.id as client_id,
  c.company_name,
  cu.email,
  'testpass123' as password
FROM clients c
JOIN client_users cu ON c.id = cu.client_id
WHERE c.fluent_customer_id = 'test-acme-001';
