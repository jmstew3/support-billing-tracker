-- Add source column to requests table (will fail silently if exists)
-- Using a stored procedure to handle this conditionally
DROP PROCEDURE IF EXISTS AddSourceColumn;
DELIMITER $$
CREATE PROCEDURE AddSourceColumn()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'support_billing_tracker'
        AND TABLE_NAME = 'requests'
        AND COLUMN_NAME = 'source'
    ) THEN
        ALTER TABLE requests
        ADD COLUMN source VARCHAR(20) DEFAULT 'sms'
        AFTER status;

        CREATE INDEX idx_source ON requests(source);
    END IF;
END$$
DELIMITER ;
CALL AddSourceColumn();
DROP PROCEDURE AddSourceColumn;

-- Create table to track Twenty CRM sync status
CREATE TABLE IF NOT EXISTS twenty_sync_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  last_sync_at TIMESTAMP NULL,
  last_sync_status ENUM('success', 'failed', 'in_progress') DEFAULT NULL,
  tickets_fetched INT DEFAULT 0,
  tickets_added INT DEFAULT 0,
  tickets_updated INT DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create table to store Twenty ticket metadata
CREATE TABLE IF NOT EXISTS twenty_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  twenty_id VARCHAR(100) UNIQUE,
  fs_creation_date DATETIME,
  ticket_status VARCHAR(50),
  subject VARCHAR(255),
  description TEXT,
  priority VARCHAR(20),
  category VARCHAR(50),
  integration_provider VARCHAR(50),
  business_impact TEXT,
  brand_name_id VARCHAR(100),
  requested_completion_date DATE,
  raw_data JSON,
  request_id INT,
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
  INDEX idx_twenty_id (twenty_id),
  INDEX idx_fs_creation_date (fs_creation_date),
  INDEX idx_request_id (request_id)
);

-- Insert initial sync status record
INSERT INTO twenty_sync_status (last_sync_at, last_sync_status, tickets_fetched)
VALUES (NULL, NULL, 0)
ON DUPLICATE KEY UPDATE id=id;