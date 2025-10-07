-- Create table to track FluentSupport sync status
CREATE TABLE IF NOT EXISTS fluent_sync_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  last_sync_at TIMESTAMP NULL,
  last_sync_status ENUM('success', 'failed', 'in_progress') DEFAULT NULL,
  tickets_fetched INT DEFAULT 0,
  tickets_added INT DEFAULT 0,
  tickets_updated INT DEFAULT 0,
  tickets_skipped INT DEFAULT 0, -- Tickets before date filter
  error_message TEXT,
  sync_duration_ms INT DEFAULT 0,
  date_filter DATE DEFAULT '2025-09-20', -- Only sync tickets after this date
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_last_sync_at (last_sync_at)
);

-- Create table to store FluentSupport ticket metadata
CREATE TABLE IF NOT EXISTS fluent_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fluent_id VARCHAR(100) UNIQUE NOT NULL, -- FluentSupport ticket ID
  ticket_number VARCHAR(50), -- Human-readable ticket number
  created_at DATETIME NOT NULL, -- Ticket creation date from FluentSupport
  updated_at_fluent DATETIME, -- Last update in FluentSupport
  ticket_status VARCHAR(50), -- active, closed, pending, etc.
  customer_id VARCHAR(100), -- FluentSupport customer ID
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  mailbox_id INT, -- FluentSupport mailbox/department
  title VARCHAR(255), -- Ticket subject
  customer_message TEXT, -- Initial customer message
  priority VARCHAR(20), -- normal, medium, high, critical
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  agent_id VARCHAR(100),
  agent_name VARCHAR(255),
  raw_data JSON, -- Full ticket data from API
  request_id INT, -- Links to requests table
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at_local TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at_local TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
  INDEX idx_fluent_id (fluent_id),
  INDEX idx_created_at (created_at),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_request_id (request_id),
  INDEX idx_customer_email (customer_email)
);

-- Insert initial sync status record
INSERT INTO fluent_sync_status (last_sync_at, last_sync_status, tickets_fetched, date_filter)
VALUES (NULL, NULL, 0, '2025-09-20')
ON DUPLICATE KEY UPDATE id=id;
