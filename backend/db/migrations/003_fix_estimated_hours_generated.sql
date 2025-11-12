-- Migration: Convert estimated_hours to GENERATED column
-- Version: 003
-- Date: 2025-10-08
-- Description: Converts estimated_hours from static decimal to GENERATED column based on effort

USE support_billing_tracker;

-- Drop the existing estimated_hours column
ALTER TABLE requests DROP COLUMN estimated_hours;

-- Add estimated_hours as a GENERATED column
ALTER TABLE requests
ADD COLUMN estimated_hours DECIMAL(3, 2) GENERATED ALWAYS AS (
  CASE effort
    WHEN 'Small' THEN 0.25
    WHEN 'Medium' THEN 0.50
    WHEN 'Large' THEN 1.00
    ELSE 0.50
  END
) STORED
AFTER website_url;

-- Verify the change
DESCRIBE requests;
