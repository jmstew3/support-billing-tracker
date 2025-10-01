-- Migration: Add is_flagged column to requests table
-- Date: 2025-10-01
-- Description: Adds boolean flag column to support row flagging feature

USE thad_chat;

-- Add is_flagged column to existing requests table (check if column doesn't exist first)
SET @column_exists = (SELECT COUNT(*)
                      FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'thad_chat'
                      AND TABLE_NAME = 'requests'
                      AND COLUMN_NAME = 'is_flagged');

SET @sql_add_column = IF(@column_exists = 0,
                         'ALTER TABLE requests ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE AFTER status',
                         'SELECT "Column already exists" AS message');
PREPARE stmt FROM @sql_add_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better query performance (check if index doesn't exist first)
SET @index_exists = (SELECT COUNT(*)
                     FROM INFORMATION_SCHEMA.STATISTICS
                     WHERE TABLE_SCHEMA = 'thad_chat'
                     AND TABLE_NAME = 'requests'
                     AND INDEX_NAME = 'idx_is_flagged');

SET @sql_add_index = IF(@index_exists = 0,
                        'ALTER TABLE requests ADD INDEX idx_is_flagged (is_flagged)',
                        'SELECT "Index already exists" AS message');
PREPARE stmt FROM @sql_add_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing rows to have default value (just in case)
UPDATE requests SET is_flagged = FALSE WHERE is_flagged IS NULL;

-- Verify the change
DESCRIBE requests;
