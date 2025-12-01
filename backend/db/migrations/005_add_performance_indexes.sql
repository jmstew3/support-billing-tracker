-- Migration: Add performance indexes for common query patterns
-- Date: 2025-12-01
-- Description: Adds missing indexes identified in architectural review

-- Add index for fluent_tickets.created_at DESC for ORDER BY performance
-- Only create if not exists
DROP PROCEDURE IF EXISTS AddFluentIndexes;
DELIMITER $$
CREATE PROCEDURE AddFluentIndexes()
BEGIN
    -- Index for ORDER BY created_at DESC queries
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_fluent_created_at_desc'
    ) THEN
        CREATE INDEX idx_fluent_created_at_desc ON fluent_tickets(created_at DESC);
    END IF;

    -- Composite index for common JOIN + ORDER queries
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_fluent_request_created'
    ) THEN
        CREATE INDEX idx_fluent_request_created ON fluent_tickets(request_id, created_at DESC);
    END IF;

    -- Index for ticket_status filtering
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fluent_tickets'
        AND INDEX_NAME = 'idx_fluent_ticket_status'
    ) THEN
        CREATE INDEX idx_fluent_ticket_status ON fluent_tickets(ticket_status);
    END IF;
END$$
DELIMITER ;

CALL AddFluentIndexes();
DROP PROCEDURE AddFluentIndexes;

-- Add composite index for requests table for common filter patterns
DROP PROCEDURE IF EXISTS AddRequestIndexes;
DELIMITER $$
CREATE PROCEDURE AddRequestIndexes()
BEGIN
    -- Index for source + status filtering (common query pattern)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'requests'
        AND INDEX_NAME = 'idx_source_status'
    ) THEN
        CREATE INDEX idx_source_status ON requests(source, status);
    END IF;

    -- Index for date range + status queries (pagination)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'requests'
        AND INDEX_NAME = 'idx_status_date_id'
    ) THEN
        CREATE INDEX idx_status_date_id ON requests(status, date DESC, id DESC);
    END IF;
END$$
DELIMITER ;

CALL AddRequestIndexes();
DROP PROCEDURE AddRequestIndexes;
