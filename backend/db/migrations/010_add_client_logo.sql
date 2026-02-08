-- Migration: Add logo_url to clients table
-- Description: Allows clients to have a custom logo displayed in their portal
-- Date: 2025-01-16

-- Add logo_url column to clients table
ALTER TABLE clients
ADD COLUMN logo_url VARCHAR(500) DEFAULT NULL
AFTER company_name;

-- Add comment for documentation
-- logo_url: URL to the client's logo image (can be relative path like /uploads/logos/client-1.png
--           or absolute URL like https://example.com/logo.png)
