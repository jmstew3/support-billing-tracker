-- Migration: Add billing_date column to requests table
-- Purpose: Allow overriding the original date for billing purposes
-- Created: 2026-01-01
-- Feature: feat/billing-date-override

-- Add billing_date column (nullable - NULL means use original date)
ALTER TABLE requests
ADD COLUMN billing_date DATE DEFAULT NULL AFTER estimated_hours;

-- Add index for efficient filtering by billing date
CREATE INDEX idx_billing_date ON requests(billing_date);

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'requests' AND COLUMN_NAME = 'billing_date';
