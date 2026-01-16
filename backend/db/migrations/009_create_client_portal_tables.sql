-- Migration: Create Client Portal Tables
-- Description: Tables for client-facing portal with secure data isolation
-- Date: 2025-01-16
-- Note: Uses utf8mb4_unicode_ci collation to match fluent_tickets table

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1. Primary client entity
-- Links FluentSupport customers and Twenty CRM brands to a unified client record
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fluent_customer_id VARCHAR(100) UNIQUE,  -- Links to fluent_tickets.customer_id
  twenty_brand_id VARCHAR(100),            -- Links to Twenty CRM brand/company
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fluent_customer_id (fluent_customer_id),
  INDEX idx_twenty_brand_id (twenty_brand_id),
  INDEX idx_company_name (company_name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Client portal login credentials (separate from internal users)
-- Admin-created only - no self-registration
CREATE TABLE IF NOT EXISTS client_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client_id (client_id),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Website-to-client mapping
-- Links Twenty CRM website properties to clients for portal display
CREATE TABLE IF NOT EXISTS client_website_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  twenty_website_property_id VARCHAR(100) NOT NULL,
  website_url VARCHAR(255),
  website_name VARCHAR(255),
  hosting_status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE KEY unique_website (client_id, twenty_website_property_id),
  INDEX idx_client_id (client_id),
  INDEX idx_twenty_website_property_id (twenty_website_property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Project-to-client mapping
-- Links Twenty CRM projects to clients for portal display
CREATE TABLE IF NOT EXISTS client_project_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  twenty_project_id VARCHAR(100) NOT NULL,
  project_name VARCHAR(255),
  project_status ENUM('planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled') DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project (client_id, twenty_project_id),
  INDEX idx_client_id (client_id),
  INDEX idx_twenty_project_id (twenty_project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add client_id to fluent_tickets for efficient filtering
-- This allows direct ticket lookups without joining through customer_id
-- Note: Run 009c_add_client_id_to_fluent_tickets.sql separately if this fails

-- 6. Client portal audit log
-- Track client access for security and compliance
CREATE TABLE IF NOT EXISTS client_audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_user_id INT,
  client_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,  -- login, logout, view_tickets, view_sites, etc.
  resource_type VARCHAR(50),     -- ticket, site, project
  resource_id VARCHAR(100),      -- ID of accessed resource
  ip_address VARCHAR(45),        -- IPv4 or IPv6
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_user_id) REFERENCES client_users(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client_user_id (client_user_id),
  INDEX idx_client_id (client_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
