-- Migration: Seed Velocity as a client in the portal
-- Description: Creates Velocity client record (user login handled by seed_velocity_user.js)
-- Run AFTER: 009_create_client_portal_tables.sql, 010_add_client_logo.sql
-- Date: 2025-01-16
--
-- Note: Run `node backend/db/seed_velocity_user.js` separately to create the portal login.
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

-- 2. Add sample websites for Velocity (if they have any)
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

-- 3. Update any existing fluent_tickets with Velocity's customer_id to link to this client
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
  c.logo_url
FROM clients c
WHERE c.company_name = 'Velocity';
