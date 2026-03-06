-- Migration: 023_add_qbo_sync_token.sql
-- Description: Add QBO optimistic locking sync token to invoices table
-- Date: 2026-03-06

ALTER TABLE invoices ADD COLUMN qbo_sync_token VARCHAR(50) DEFAULT NULL AFTER qbo_sync_error;
