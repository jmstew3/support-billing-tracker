-- Migration: 008_create_invoice_tables.sql
-- Description: Add customers, invoices, and invoice_items tables for QuickBooks integration
-- Date: 2026-01-16

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
-- Track clients for multi-client billing support
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  payment_terms INT DEFAULT 30,  -- NET 30, etc.
  qbo_customer_id VARCHAR(100),  -- QuickBooks Online ID for future sync
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_customer_name (name),
  INDEX idx_customer_email (email),
  INDEX idx_customer_qbo (qbo_customer_id),
  INDEX idx_customer_active (is_active)
);

-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Track invoices with QuickBooks integration fields
CREATE TABLE IF NOT EXISTS invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5, 4) DEFAULT 0.0000,  -- e.g., 0.0825 for 8.25%
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  balance_due DECIMAL(10, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  payment_date DATE DEFAULT NULL,
  notes TEXT,
  internal_notes TEXT,
  qbo_invoice_id VARCHAR(100),  -- QuickBooks Online ID for future sync
  qbo_sync_status ENUM('pending', 'synced', 'error', 'not_applicable') DEFAULT 'not_applicable',
  qbo_sync_date TIMESTAMP NULL,
  qbo_sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,

  INDEX idx_invoice_number (invoice_number),
  INDEX idx_invoice_customer (customer_id),
  INDEX idx_invoice_status (status),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_invoice_period (period_start, period_end),
  INDEX idx_invoice_qbo (qbo_invoice_id)
);

-- =====================================================
-- INVOICE ITEMS TABLE
-- =====================================================
-- Line items for each invoice
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  item_type ENUM('support', 'project', 'hosting', 'other') NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,  -- hours or count
  unit_price DECIMAL(10, 2) NOT NULL,  -- rate per unit
  amount DECIMAL(10, 2) NOT NULL,  -- quantity * unit_price
  sort_order INT DEFAULT 0,
  request_ids JSON,  -- Array of linked request IDs for support items
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,

  INDEX idx_item_invoice (invoice_id),
  INDEX idx_item_type (item_type)
);

-- =====================================================
-- ADD COLUMNS TO REQUESTS TABLE
-- =====================================================
-- Link requests to customers and invoices
ALTER TABLE requests
  ADD COLUMN customer_id INT DEFAULT NULL AFTER billing_date,
  ADD COLUMN invoice_id INT DEFAULT NULL AFTER customer_id,
  ADD INDEX idx_request_customer (customer_id),
  ADD INDEX idx_request_invoice (invoice_id);

-- Add foreign key constraints (separate statements for MySQL compatibility)
ALTER TABLE requests
  ADD CONSTRAINT fk_request_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE requests
  ADD CONSTRAINT fk_request_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- =====================================================
-- SEED DEFAULT CUSTOMER (Velocity)
-- =====================================================
-- Insert default customer for existing requests
INSERT INTO customers (id, name, email, payment_terms, notes)
VALUES (1, 'Velocity', 'billing@velocity.com', 30, 'Primary client - Turbo support agreement')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Link existing requests to the default customer
UPDATE requests SET customer_id = 1 WHERE customer_id IS NULL;

-- =====================================================
-- VIEWS
-- =====================================================
-- View for invoice summary with customer info
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  c.name AS customer_name,
  c.email AS customer_email,
  i.period_start,
  i.period_end,
  i.invoice_date,
  i.due_date,
  i.status,
  i.subtotal,
  i.tax_amount,
  i.total,
  i.amount_paid,
  i.balance_due,
  i.qbo_sync_status,
  i.created_at
FROM invoices i
JOIN customers c ON i.customer_id = c.id;

-- View for monthly billing summary (for invoice generation)
CREATE OR REPLACE VIEW monthly_billing_summary AS
SELECT
  r.customer_id,
  c.name AS customer_name,
  DATE_FORMAT(r.date, '%Y-%m') AS billing_month,
  DATE_FORMAT(r.date, '%Y-%m-01') AS period_start,
  LAST_DAY(r.date) AS period_end,
  COUNT(*) AS request_count,
  SUM(r.estimated_hours) AS total_hours,
  SUM(CASE WHEN r.urgency = 'HIGH' THEN r.estimated_hours ELSE 0 END) AS emergency_hours,
  SUM(CASE WHEN r.urgency = 'MEDIUM' THEN r.estimated_hours ELSE 0 END) AS regular_hours,
  SUM(CASE WHEN r.urgency = 'LOW' THEN r.estimated_hours ELSE 0 END) AS low_priority_hours
FROM requests r
JOIN customers c ON r.customer_id = c.id
WHERE r.status = 'active'
  AND r.invoice_id IS NULL
  AND r.category NOT IN ('Non-billable', 'Migration')
GROUP BY r.customer_id, c.name, DATE_FORMAT(r.date, '%Y-%m');
