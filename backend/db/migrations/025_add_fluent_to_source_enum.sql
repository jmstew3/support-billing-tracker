-- Migration: Add 'fluent' to requests.source enum
-- The schema.sql already includes 'fluent' but this was missing from the live enum
-- Required for FluentSupport ticket sync to work correctly
-- Date: 2026-03-07

ALTER TABLE requests
  MODIFY COLUMN source ENUM('sms', 'ticket', 'email', 'phone', 'fluent') DEFAULT 'sms';
