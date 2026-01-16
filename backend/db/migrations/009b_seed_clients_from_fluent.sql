-- Migration: Seed clients from existing FluentSupport data
-- Description: Populate clients table from fluent_tickets customer data
-- Run AFTER: 009_create_client_portal_tables.sql
-- Date: 2025-01-16

-- Insert unique clients from fluent_tickets
-- Groups by customer_id to create one client per FluentSupport customer
INSERT INTO clients (fluent_customer_id, company_name, contact_email)
SELECT DISTINCT
  ft.customer_id,
  COALESCE(ft.customer_name, 'Unknown Client'),
  COALESCE(ft.customer_email, CONCAT(ft.customer_id, '@unknown.com'))
FROM fluent_tickets ft
WHERE ft.customer_id IS NOT NULL
  AND ft.customer_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.fluent_customer_id = ft.customer_id
  )
ON DUPLICATE KEY UPDATE
  company_name = COALESCE(VALUES(company_name), company_name),
  contact_email = COALESCE(VALUES(contact_email), contact_email);

-- Update fluent_tickets with client_id references
UPDATE fluent_tickets ft
JOIN clients c ON ft.customer_id = c.fluent_customer_id
SET ft.client_id = c.id
WHERE ft.client_id IS NULL;

-- Report results
SELECT
  (SELECT COUNT(*) FROM clients) as total_clients,
  (SELECT COUNT(*) FROM fluent_tickets WHERE client_id IS NOT NULL) as linked_tickets,
  (SELECT COUNT(*) FROM fluent_tickets WHERE client_id IS NULL) as unlinked_tickets;
