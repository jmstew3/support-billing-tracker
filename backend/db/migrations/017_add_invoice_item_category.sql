-- Add category column to invoice_items table
-- Stores project category (e.g. 'Migration', 'Landing Page') for display in the UI

ALTER TABLE invoice_items
ADD COLUMN category VARCHAR(100) DEFAULT NULL
AFTER sort_order;
