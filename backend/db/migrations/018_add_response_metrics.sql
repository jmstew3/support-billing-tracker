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

-- Recalculate estimated_hours for existing fluent-sourced requests
-- Formula: response_count * 0.25 * urgency_multiplier, clamped to [0.25, 10.0]
UPDATE requests r
JOIN fluent_tickets ft ON ft.request_id = r.id
SET r.estimated_hours = GREATEST(0.25, LEAST(10.0,
  COALESCE(ft.response_count, 1) * 0.25 *
  CASE r.urgency
    WHEN 'HIGH' THEN 1.5
    WHEN 'MEDIUM' THEN 1.0
    ELSE 0.75
  END
))
WHERE r.source = 'fluent';
