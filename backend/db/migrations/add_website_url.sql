-- Add website_url column to requests table
-- This stores the primary website URL extracted from FluentSupport tickets

ALTER TABLE requests
ADD COLUMN website_url VARCHAR(500) NULL AFTER source;

-- Add index for searching/filtering by website URL
CREATE INDEX idx_website_url ON requests(website_url);

-- Update comment
ALTER TABLE requests
COMMENT = 'Support requests from multiple sources (SMS, Twenty CRM, FluentSupport)';
