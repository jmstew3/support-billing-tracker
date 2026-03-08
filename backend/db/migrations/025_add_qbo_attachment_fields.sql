-- Migration: 025_add_qbo_attachment_fields.sql
-- Adds columns to track QBO invoice attachment status

ALTER TABLE invoices
  ADD COLUMN qbo_attachment_id VARCHAR(100) DEFAULT NULL AFTER qbo_sync_token,
  ADD COLUMN qbo_attachment_error TEXT DEFAULT NULL AFTER qbo_attachment_id;
