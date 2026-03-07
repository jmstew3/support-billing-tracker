-- Migration: 021_create_qbo_tokens_table.sql
-- Description: Store encrypted QBO OAuth tokens for API integration
-- Date: 2026-03-06

CREATE TABLE IF NOT EXISTS qbo_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  realm_id VARCHAR(100) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,              -- AES-256-GCM encrypted
  refresh_token TEXT NOT NULL,             -- AES-256-GCM encrypted
  token_type VARCHAR(50) DEFAULT 'Bearer',
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  last_refreshed_at TIMESTAMP DEFAULT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_qbo_realm (realm_id),
  INDEX idx_qbo_active (is_active)
);
