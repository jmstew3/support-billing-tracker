-- Migration: Add composite performance indexes for common query patterns
-- Date: 2026-02-28
-- Description: Adds composite indexes for fluent_tickets client/mailbox queries
--              and invoices list queries with filters

-- fluent_tickets composite indexes for client portal and listing queries
DROP PROCEDURE IF EXISTS AddFluentCompositeIndexes;
DELIMITER $$
CREATE PROCEDURE AddFluentCompositeIndexes()
BEGIN
    -- Index for client portal queries: WHERE client_id = ? ORDER BY created_at DESC
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_ft_client_created'
    ) THEN
        CREATE INDEX idx_ft_client_created ON fluent_tickets(client_id, created_at DESC);
    END IF;

    -- Index for client + status filtering
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_ft_client_status'
    ) THEN
        CREATE INDEX idx_ft_client_status ON fluent_tickets(client_id, ticket_status);
    END IF;

    -- Index for mailbox queries: WHERE mailbox_id = ? ORDER BY created_at DESC
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_ft_mailbox_created'
    ) THEN
        CREATE INDEX idx_ft_mailbox_created ON fluent_tickets(mailbox_id, created_at DESC);
    END IF;
END$$
DELIMITER ;

CALL AddFluentCompositeIndexes();
DROP PROCEDURE AddFluentCompositeIndexes;

-- invoices composite index for list queries with customer + status + date filters
DROP PROCEDURE IF EXISTS AddInvoiceIndexes;
DELIMITER $$
CREATE PROCEDURE AddInvoiceIndexes()
BEGIN
    -- Index for list queries: WHERE customer_id = ? AND status = ? ORDER BY invoice_date DESC
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'invoices'
        AND INDEX_NAME = 'idx_inv_customer_status_date'
    ) THEN
        CREATE INDEX idx_inv_customer_status_date ON invoices(customer_id, status, invoice_date DESC);
    END IF;
END$$
DELIMITER ;

CALL AddInvoiceIndexes();
DROP PROCEDURE AddInvoiceIndexes;
