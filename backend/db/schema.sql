-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS thad_chat;
USE thad_chat;

-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS requests;

-- Create requests table
CREATE TABLE requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  month VARCHAR(7) GENERATED ALWAYS AS (DATE_FORMAT(date, '%Y-%m')) STORED,
  request_type VARCHAR(50) DEFAULT 'General Request',
  category VARCHAR(50) NOT NULL DEFAULT 'Support',
  description TEXT,
  urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'PROMOTION') DEFAULT 'MEDIUM',
  effort ENUM('Small', 'Medium', 'Large') DEFAULT 'Medium',
  status ENUM('active', 'deleted', 'ignored') DEFAULT 'active',
  source ENUM('sms', 'ticket', 'email', 'phone') DEFAULT 'sms',
  website_url VARCHAR(255) DEFAULT NULL,
  estimated_hours DECIMAL(5, 2) DEFAULT 0.50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for better query performance
  INDEX idx_date (date),
  INDEX idx_month (month),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency),
  INDEX idx_composite (status, date, category)
);

-- Create a view for active requests (convenience)
CREATE OR REPLACE VIEW active_requests AS
SELECT * FROM requests WHERE status = 'active';

-- Create a view for request statistics
CREATE OR REPLACE VIEW request_statistics AS
SELECT
  category,
  urgency,
  COUNT(*) as count,
  SUM(estimated_hours) as total_hours,
  AVG(estimated_hours) as avg_hours,
  MIN(date) as first_request,
  MAX(date) as last_request
FROM requests
WHERE status = 'active'
GROUP BY category, urgency;

-- Sample data insertion (commented out, will be done via import script)
-- INSERT INTO requests (date, time, request_type, category, description, urgency, effort) VALUES
-- ('2025-05-08', '12:56:31', 'General Request', 'Support', 'Do you remember roughly when that one was ordered?', 'MEDIUM', 'Medium');