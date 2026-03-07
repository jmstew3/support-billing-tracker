-- Migration: 024_add_environment_to_qbo_tokens.sql
-- Description: Add environment column to qbo_tokens for sandbox/production token isolation
-- Date: 2026-03-07

ALTER TABLE qbo_tokens ADD COLUMN environment VARCHAR(20) DEFAULT 'production' AFTER realm_id;

-- Update existing tokens to match current environment
-- (existing tokens are production since that's what was configured)
