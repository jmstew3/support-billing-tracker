-- Migration: Seed Velocity client portal user
-- Creates thad@velocity-seo.com user for Velocity client (fluent_customer_id=7)
-- Password: VelocityPortal2025!

INSERT INTO client_users (client_id, email, password_hash, name, is_active)
SELECT
  c.id,
  'thad@velocity-seo.com',
  '$2b$10$5s2AhqTN2LUW6QUi5MNfx.gxI3CZenpW.bwZzSSlGhYZhYAhbWRNe',
  'Thad',
  TRUE
FROM clients c
WHERE c.fluent_customer_id = '7'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Verify
SELECT 'Velocity user seeded' as status, cu.email, c.company_name
FROM client_users cu
JOIN clients c ON cu.client_id = c.id
WHERE cu.email = 'thad@velocity-seo.com';
