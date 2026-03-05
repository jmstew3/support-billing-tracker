-- Migration: 019_fix_velocity_customer_name.sql
-- Description: Update Velocity customer name to match QBO display name exactly
-- The QBO importer requires character-for-character match on Customer column
-- Date: 2026-03-04

UPDATE customers
SET name = 'Velocity Business Automation, LLC'
WHERE id = 1 AND name = 'Velocity';
