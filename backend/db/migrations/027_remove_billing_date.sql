-- Migration 027: Remove billing_date column
-- billing_date is now redundant because fluentSupportApi.js already writes resolved_at
-- into requests.date for all closed FluentSupport tickets. Any manually-set billing_date
-- values are backfilled into requests.date before the column is dropped.

-- Step 1: Preserve any manually-set billing_date values by copying into requests.date
UPDATE requests
SET date = billing_date
WHERE billing_date IS NOT NULL AND billing_date != date;

-- Step 2: Drop the index and column
ALTER TABLE requests DROP INDEX idx_billing_date;
ALTER TABLE requests DROP COLUMN billing_date;
