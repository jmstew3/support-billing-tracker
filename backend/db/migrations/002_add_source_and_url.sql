-- Migration: Add source and website_url columns
-- Version: 002
-- Date: 2025-10-08
-- Description: Adds missing source and website_url columns to requests table

USE support_billing_tracker;

-- Add source column if it doesn't exist
ALTER TABLE requests
ADD COLUMN source ENUM('sms', 'ticket', 'email', 'phone') DEFAULT 'sms'
AFTER status;

-- Add website_url column if it doesn't exist
ALTER TABLE requests
ADD COLUMN website_url VARCHAR(255) DEFAULT NULL
AFTER source;

-- Add index for source column for better query performance
CREATE INDEX idx_source ON requests(source);

-- Verify the changes
DESCRIBE requests;
