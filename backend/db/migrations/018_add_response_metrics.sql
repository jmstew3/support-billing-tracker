-- Migration 018: Add response metrics to fluent_tickets and backfill estimated_hours
-- Adds response_count and total_close_time columns for hour estimation transparency

ALTER TABLE fluent_tickets
  ADD COLUMN response_count INT DEFAULT 0 AFTER priority,
  ADD COLUMN total_close_time INT DEFAULT NULL AFTER response_count;

-- Backfill response_count and total_close_time from raw_data JSON
UPDATE fluent_tickets
SET response_count = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.response_count')), 0),
    total_close_time = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.total_close_time')), 'null')
WHERE raw_data IS NOT NULL;

-- Note: estimated_hours backfill removed — only new tickets get formula-based hours.
-- Existing tickets preserve manually-logged hours.
