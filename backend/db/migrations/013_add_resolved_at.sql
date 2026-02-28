-- Add resolved_at column to fluent_tickets table
-- This stores the date/time when a FluentSupport ticket was closed/resolved
-- Used as the primary date for organizing closed tickets instead of created_at

ALTER TABLE fluent_tickets
  ADD COLUMN resolved_at DATETIME DEFAULT NULL AFTER updated_at_fluent;

ALTER TABLE fluent_tickets
  ADD INDEX idx_resolved_at (resolved_at);
