-- Add request_snapshot column to invoices table
-- Stores the per-request detail at send time
-- so sent invoices always show what was billed, even if request data changes later.

ALTER TABLE invoices
ADD COLUMN request_snapshot JSON DEFAULT NULL
AFTER hosting_detail_snapshot;
