-- Migration: Add client_id to fluent_tickets
-- Description: Links fluent_tickets to clients table for efficient filtering
-- Run AFTER: 009_create_client_portal_tables.sql
-- Date: 2025-01-16
-- Note: This migration may fail if column already exists - that's OK

-- Add client_id column to fluent_tickets
ALTER TABLE fluent_tickets ADD COLUMN client_id INT;

-- Add foreign key constraint
ALTER TABLE fluent_tickets ADD CONSTRAINT fk_fluent_tickets_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX idx_fluent_tickets_client_id ON fluent_tickets(client_id);
