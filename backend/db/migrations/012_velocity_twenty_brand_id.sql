-- Migration: Set Velocity's Twenty CRM Brand ID
-- Description: Links Velocity client to their Twenty CRM company for website property filtering
-- Date: 2025-01-17
--
-- The parentCompanyId in websiteProperties links sites to companies in Twenty CRM
-- Velocity's Company ID: cac8256c-9119-4c8c-8e0e-a821ce04cfe9

-- Update Velocity client with their Twenty CRM company ID
UPDATE clients
SET twenty_brand_id = 'cac8256c-9119-4c8c-8e0e-a821ce04cfe9',
    updated_at = NOW()
WHERE company_name = 'Velocity';

-- Also try matching by different possible names
UPDATE clients
SET twenty_brand_id = 'cac8256c-9119-4c8c-8e0e-a821ce04cfe9',
    updated_at = NOW()
WHERE company_name = 'Velocity Marketing Online'
  AND twenty_brand_id IS NULL;

-- Report result
SELECT
  id as client_id,
  company_name,
  twenty_brand_id,
  fluent_customer_id,
  updated_at
FROM clients
WHERE twenty_brand_id = 'cac8256c-9119-4c8c-8e0e-a821ce04cfe9'
   OR company_name LIKE '%Velocity%';
