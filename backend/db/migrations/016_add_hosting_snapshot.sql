-- Add hosting_detail_snapshot column to invoices table
-- Stores the per-site hosting breakdown at invoice generation time
-- so exports always match what was billed, even if hosting data changes later.

ALTER TABLE invoices
ADD COLUMN hosting_detail_snapshot JSON DEFAULT NULL
AFTER notes;
