-- Migration: 022_create_qbo_item_mappings_table.sql
-- Description: Map internal invoice line item types to QBO Service Item IDs
-- Date: 2026-03-06

CREATE TABLE IF NOT EXISTS qbo_item_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  internal_item_type ENUM('support', 'project', 'hosting', 'credit', 'other') NOT NULL,
  internal_category VARCHAR(100) DEFAULT NULL,
  internal_description VARCHAR(255) DEFAULT NULL,
  qbo_item_id VARCHAR(100) NOT NULL,
  qbo_item_name VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_internal_mapping (internal_item_type, internal_category, internal_description),
  INDEX idx_qbo_item (qbo_item_id)
);
