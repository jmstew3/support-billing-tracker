-- Migration: 006_create_refresh_tokens_table.sql
-- Description: Create refresh_tokens table for persistent JWT refresh token storage
-- Date: 2025-01-14
--
-- SECURITY FIX: Replaces in-memory Set() storage which:
--   - Lost all tokens on server restart
--   - Could not scale horizontally
--   - Had no token expiration cleanup
--   - Was vulnerable to memory exhaustion

USE velocity_billing;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash of the token (never store plaintext)
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,        -- Null = active, set = revoked
  user_agent VARCHAR(255) NULL,     -- Optional: track device/browser
  ip_address VARCHAR(45) NULL,      -- Optional: track IP (supports IPv6)

  -- Indexes for performance
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_active (user_id, revoked_at),

  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create event to automatically clean up expired tokens (optional, requires event_scheduler=ON)
-- This runs daily to remove tokens that expired more than 7 days ago
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_refresh_tokens
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END//
DELIMITER ;

-- Note: To enable the event scheduler, run:
-- SET GLOBAL event_scheduler = ON;
-- Or add to my.cnf: event_scheduler=ON
