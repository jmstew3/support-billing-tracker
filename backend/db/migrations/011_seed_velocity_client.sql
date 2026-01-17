-- Migration: Seed Velocity as a client in the portal
-- Description: Creates Velocity client record with user login and sample data
-- Run AFTER: 009_create_client_portal_tables.sql, 010_add_client_logo.sql
-- Date: 2025-01-16
--
-- Velocity Portal Credentials:
--   Email: thad@velocity-seo.com
--   Password: VelocityPortal2025!
--
-- Note: Update the fluent_customer_id with Velocity's actual ID from fluent_tickets
--       if you want to link their existing support tickets

-- 1. Create Velocity client record
INSERT INTO clients (fluent_customer_id, company_name, logo_url, contact_email, contact_phone, is_active, notes)
VALUES (
  'velocity-001',  -- Update this with actual fluent_customer_id if different
  'Velocity',
  NULL,  -- Logo URL can be updated later via admin panel
  'thad@velocity-seo.com',
  NULL,
  TRUE,
  'Velocity - Primary client account for portal demonstration'
)
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  contact_email = VALUES(contact_email);

-- 2. Create Velocity client user for portal login
-- Password: VelocityPortal2025! (bcrypt hash with 10 rounds)
-- Generate with: const bcrypt = require('bcryptjs'); bcrypt.hashSync('VelocityPortal2025!', 10)
INSERT INTO client_users (client_id, email, password_hash, name, is_active)
SELECT
  c.id,
  'thad@velocity-seo.com',
  '$2b$10$4undVDems.IHhAb34WUvz.DGio/8xQx8UwZ0T0DW8T8WIbB7L.a6q',
  'Velocity Admin',
  TRUE
FROM clients c
WHERE c.company_name = 'Velocity'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. Add sample websites for Velocity (if they have any)
-- Uncomment and modify as needed
-- INSERT INTO client_website_links (client_id, twenty_website_property_id, website_url, website_name, hosting_status)
-- SELECT
--   c.id,
--   'velocity-site-001',
--   'velocitymarketingonline.com',
--   'Velocity',
--   'active'
-- FROM clients c
-- WHERE c.company_name = 'Velocity'
-- ON DUPLICATE KEY UPDATE website_name = VALUES(website_name);

-- 4. Update any existing fluent_tickets with Velocity's customer_id to link to this client
-- UPDATE fluent_tickets ft
-- JOIN clients c ON c.company_name = 'Velocity'
-- SET ft.client_id = c.id
-- WHERE ft.customer_email LIKE '%@velocitymarketingonline.com%'
--   AND ft.client_id IS NULL;

-- Report results
SELECT
  'Velocity client seeded' as status,
  c.id as client_id,
  c.company_name,
  c.logo_url,
  cu.email as user_email,
  'VelocityPortal2025!' as password
FROM clients c
LEFT JOIN client_users cu ON c.id = cu.client_id
WHERE c.company_name = 'Velocity';
