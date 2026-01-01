-- Migration: Create audit_logs table for security event tracking
-- Date: 2025-12-15
-- Description: Stores audit trail for sensitive operations

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Who performed the action
  user_id INT,
  user_email VARCHAR(255),
  auth_method ENUM('jwt', 'basicauth', 'system') DEFAULT 'system',

  -- What action was performed
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),

  -- Details of the action
  details JSON,

  -- Request context
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),

  -- Outcome
  status ENUM('success', 'failure', 'error') DEFAULT 'success',
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for querying
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),

  -- Foreign key (optional - user may not exist for system events)
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Sample audit actions:
-- AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILURE, AUTH_LOGOUT
-- AUTH_PASSWORD_CHANGE, AUTH_TOKEN_REFRESH, AUTH_SESSION_REVOKE
-- DATA_CREATE, DATA_UPDATE, DATA_DELETE, DATA_BULK_UPDATE
-- DATA_IMPORT, DATA_EXPORT, DATA_BACKUP, DATA_RESTORE
-- ADMIN_USER_CREATE, ADMIN_USER_UPDATE, ADMIN_CONFIG_CHANGE
