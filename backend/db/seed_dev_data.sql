-- =============================================================================
-- Development Seed Data
-- Run: docker exec -i support-billing-tracker-mysql mysql -u thaduser -pthadpassword velocity_billing < backend/db/seed_dev_data.sql
-- =============================================================================

USE velocity_billing;

-- ---------------------------------------------------------------------------
-- CUSTOMERS (billing entities)
-- ---------------------------------------------------------------------------
INSERT INTO customers (id, name, email, phone, address_line1, city, state, postal_code, country, payment_terms, qbo_customer_id, is_active)
VALUES
  (1, 'Velocity', 'thad@velocity-seo.com', '555-100-0001', '123 Main St', 'Charlotte', 'NC', '28202', 'USA', 30, 'QBO-VEL-001', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO customers (name, email, phone, address_line1, city, state, postal_code, country, payment_terms, qbo_customer_id, is_active)
VALUES
  ('Greenleaf Organics', 'billing@greenleaforganics.com', '555-100-0002', '456 Oak Ave', 'Asheville', 'NC', '28801', 'USA', 30, 'QBO-GLO-002', TRUE),
  ('Summit Fitness Co', 'accounts@summitfitness.co', '555-100-0003', '789 Peak Blvd', 'Denver', 'CO', '80202', 'USA', 15, 'QBO-SFC-003', TRUE),
  ('Coastal Realty Group', 'admin@coastalrealtygroup.com', '555-100-0004', '321 Beach Rd', 'Wilmington', 'NC', '28401', 'USA', 30, NULL, TRUE),
  ('BlueLine Manufacturing', 'ap@bluelinemfg.com', '555-100-0005', '555 Industrial Pkwy', 'Raleigh', 'NC', '27601', 'USA', 45, 'QBO-BLM-005', TRUE);

-- ---------------------------------------------------------------------------
-- REQUESTS - extend through Feb 2026 with varied statuses
-- ---------------------------------------------------------------------------
-- July 2025
INSERT INTO requests (date, time, request_type, category, description, urgency, effort, status, source, website_url, estimated_hours, billing_date, customer_id) VALUES
('2025-07-02', '09:00:00', 'Bug Fix', 'Website', 'Header navigation dropdown broken on Safari', 'HIGH', 'Medium', 'active', 'ticket', 'https://velocity-seo.com', 2.00, '2025-07-31', 1),
('2025-07-05', '11:30:00', 'Update', 'Support', 'Update FAQ page with new service offerings', 'LOW', 'Small', 'active', 'email', NULL, 0.50, '2025-07-31', 1),
('2025-07-08', '14:15:00', 'New Feature', 'Forms', 'Add file upload to contact form', 'MEDIUM', 'Medium', 'active', 'sms', 'https://greenleaforganics.com', 1.50, '2025-07-31', 2),
('2025-07-10', '08:45:00', 'Bug Fix', 'Email', 'Autoresponder sending duplicate emails', 'HIGH', 'Small', 'active', 'phone', NULL, 1.00, '2025-07-31', 2),
('2025-07-14', '16:00:00', 'Update', 'Website', 'Swap hero banner for summer campaign', 'LOW', 'Small', 'active', 'ticket', 'https://summitfitness.co', 0.50, '2025-07-31', 3),
('2025-07-18', '10:30:00', 'Advisory', 'Advisory', 'SEO audit and recommendations report', 'MEDIUM', 'Large', 'active', 'email', NULL, 4.00, '2025-07-31', 1),
('2025-07-22', '13:00:00', 'New Feature', 'Hosting', 'Set up staging environment for redesign', 'MEDIUM', 'Medium', 'active', 'sms', 'https://coastalrealtygroup.com', 2.00, '2025-07-31', 4),
('2025-07-25', '09:30:00', 'Bug Fix', 'Scripts', 'Broken analytics tracking script', 'HIGH', 'Small', 'deleted', 'ticket', NULL, 0.50, NULL, 1),
('2025-07-28', '15:45:00', 'Migration', 'Migration', 'Migrate email from GoDaddy to Google Workspace', 'MEDIUM', 'Large', 'active', 'email', NULL, 5.00, '2025-07-31', 3),
('2025-07-30', '11:00:00', 'Support', 'Support', 'Password reset assistance for staff accounts', 'LOW', 'Small', 'ignored', 'phone', NULL, 0.25, NULL, 1),

-- August 2025
('2025-08-01', '08:30:00', 'New Feature', 'Website', 'Add testimonials carousel to homepage', 'MEDIUM', 'Medium', 'active', 'ticket', 'https://velocity-seo.com', 2.50, '2025-08-31', 1),
('2025-08-04', '10:00:00', 'Bug Fix', 'Forms', 'Form validation error on mobile devices', 'HIGH', 'Small', 'active', 'sms', 'https://greenleaforganics.com', 1.00, '2025-08-31', 2),
('2025-08-07', '14:30:00', 'Update', 'Billing', 'Update payment gateway to Stripe v3', 'MEDIUM', 'Large', 'active', 'email', NULL, 4.50, '2025-08-31', 1),
('2025-08-11', '09:15:00', 'Support', 'Support', 'Train staff on CMS content updates', 'LOW', 'Medium', 'active', 'phone', NULL, 1.50, '2025-08-31', 4),
('2025-08-14', '16:30:00', 'New Feature', 'Email', 'Set up drip campaign for new subscribers', 'MEDIUM', 'Medium', 'active', 'ticket', NULL, 2.00, '2025-08-31', 2),
('2025-08-18', '11:45:00', 'Bug Fix', 'Website', 'Image lazy loading causing layout shift', 'MEDIUM', 'Small', 'active', 'sms', 'https://summitfitness.co', 0.75, '2025-08-31', 3),
('2025-08-21', '13:30:00', 'Advisory', 'Advisory', 'Quarterly performance review and roadmap', 'LOW', 'Large', 'active', 'email', NULL, 3.00, '2025-08-31', 1),
('2025-08-25', '10:00:00', 'Update', 'Hosting', 'SSL certificate renewal for 3 domains', 'HIGH', 'Small', 'active', 'ticket', NULL, 0.50, '2025-08-31', 1),
('2025-08-28', '15:00:00', 'Migration', 'Migration', 'Migrate WordPress to new hosting provider', 'MEDIUM', 'Large', 'active', 'email', 'https://bluelinemfg.com', 6.00, '2025-08-31', 5),
('2025-08-30', '09:00:00', 'Bug Fix', 'Scripts', 'Google Tag Manager firing events twice', 'MEDIUM', 'Small', 'deleted', 'phone', NULL, 0.50, NULL, 3),

-- September 2025
('2025-09-02', '08:00:00', 'New Feature', 'Website', 'Implement blog section with categories', 'MEDIUM', 'Large', 'active', 'ticket', 'https://velocity-seo.com', 5.00, '2025-09-30', 1),
('2025-09-05', '10:30:00', 'Bug Fix', 'Forms', 'reCAPTCHA v3 blocking legitimate submissions', 'HIGH', 'Medium', 'active', 'sms', 'https://coastalrealtygroup.com', 1.50, '2025-09-30', 4),
('2025-09-08', '14:00:00', 'Update', 'Email', 'Update email templates for fall campaign', 'LOW', 'Medium', 'active', 'email', NULL, 1.50, '2025-09-30', 2),
('2025-09-11', '11:15:00', 'Support', 'Support', 'Investigate slow page load times', 'HIGH', 'Medium', 'active', 'phone', 'https://greenleaforganics.com', 2.00, '2025-09-30', 2),
('2025-09-15', '09:45:00', 'New Feature', 'Billing', 'Add recurring invoice automation', 'MEDIUM', 'Large', 'active', 'ticket', NULL, 4.00, '2025-09-30', 1),
('2025-09-18', '13:30:00', 'Bug Fix', 'Website', 'Broken internal links after URL restructure', 'MEDIUM', 'Medium', 'active', 'sms', 'https://summitfitness.co', 1.50, '2025-09-30', 3),
('2025-09-22', '16:00:00', 'Advisory', 'Advisory', 'Accessibility compliance assessment', 'LOW', 'Large', 'active', 'email', NULL, 3.50, '2025-09-30', 5),
('2025-09-25', '10:00:00', 'Update', 'Hosting', 'Upgrade server to handle traffic spike', 'HIGH', 'Medium', 'active', 'phone', NULL, 2.00, '2025-09-30', 1),
('2025-09-28', '14:30:00', 'Support', 'Support', 'DNS configuration for new subdomain', 'LOW', 'Small', 'active', 'ticket', NULL, 0.50, '2025-09-30', 4),
('2025-09-30', '08:30:00', 'Bug Fix', 'Scripts', 'Chatbot widget conflicting with cookie banner', 'MEDIUM', 'Small', 'ignored', 'sms', NULL, 0.50, NULL, 3),

-- October 2025
('2025-10-01', '09:00:00', 'New Feature', 'Website', 'Build property listing search with filters', 'MEDIUM', 'Large', 'active', 'ticket', 'https://coastalrealtygroup.com', 8.00, '2025-10-31', 4),
('2025-10-03', '11:00:00', 'Bug Fix', 'Email', 'Contact form emails going to spam', 'HIGH', 'Small', 'active', 'sms', NULL, 1.00, '2025-10-31', 2),
('2025-10-07', '14:45:00', 'Update', 'Website', 'Refresh product catalog with Q4 inventory', 'LOW', 'Medium', 'active', 'email', 'https://bluelinemfg.com', 2.00, '2025-10-31', 5),
('2025-10-10', '08:30:00', 'Support', 'Support', 'Help configuring Google Business Profile', 'LOW', 'Small', 'active', 'phone', NULL, 0.50, '2025-10-31', 3),
('2025-10-14', '16:15:00', 'New Feature', 'Forms', 'Multi-step lead capture form', 'MEDIUM', 'Large', 'active', 'ticket', 'https://summitfitness.co', 3.50, '2025-10-31', 3),
('2025-10-17', '10:30:00', 'Bug Fix', 'Billing', 'Invoice PDF generation showing wrong dates', 'HIGH', 'Medium', 'active', 'sms', NULL, 1.50, '2025-10-31', 1),
('2025-10-21', '13:00:00', 'Migration', 'Migration', 'Migrate 5 sites from shared to VPS hosting', 'MEDIUM', 'Large', 'active', 'email', NULL, 6.00, '2025-10-31', 1),
('2025-10-24', '09:30:00', 'Update', 'Hosting', 'Configure CDN for global asset delivery', 'MEDIUM', 'Medium', 'active', 'ticket', NULL, 2.00, '2025-10-31', 4),
('2025-10-28', '15:00:00', 'Advisory', 'Advisory', 'Annual website strategy planning session', 'LOW', 'Large', 'active', 'email', NULL, 3.00, '2025-10-31', 1),
('2025-10-31', '11:30:00', 'Bug Fix', 'Website', 'Mobile menu not closing after navigation', 'MEDIUM', 'Small', 'deleted', 'phone', 'https://greenleaforganics.com', 0.50, NULL, 2),

-- November 2025
('2025-11-03', '08:15:00', 'New Feature', 'Website', 'Add event calendar with RSVP functionality', 'MEDIUM', 'Large', 'active', 'ticket', 'https://velocity-seo.com', 5.00, '2025-11-30', 1),
('2025-11-05', '10:45:00', 'Bug Fix', 'Forms', 'Date picker not working in Firefox', 'HIGH', 'Small', 'active', 'sms', 'https://coastalrealtygroup.com', 0.75, '2025-11-30', 4),
('2025-11-08', '14:00:00', 'Update', 'Email', 'Holiday campaign email sequence setup', 'MEDIUM', 'Medium', 'active', 'email', NULL, 2.00, '2025-11-30', 2),
('2025-11-11', '09:30:00', 'Support', 'Support', 'Troubleshoot WooCommerce checkout errors', 'HIGH', 'Medium', 'active', 'phone', 'https://greenleaforganics.com', 2.50, '2025-11-30', 2),
('2025-11-14', '13:15:00', 'New Feature', 'Scripts', 'Implement custom analytics dashboard', 'MEDIUM', 'Large', 'active', 'ticket', NULL, 4.00, '2025-11-30', 1),
('2025-11-18', '16:30:00', 'Bug Fix', 'Website', 'Footer links pointing to old domain', 'LOW', 'Small', 'active', 'sms', 'https://bluelinemfg.com', 0.50, '2025-11-30', 5),
('2025-11-21', '11:00:00', 'Update', 'Billing', 'Year-end billing reconciliation support', 'MEDIUM', 'Medium', 'active', 'email', NULL, 2.00, '2025-11-30', 1),
('2025-11-24', '08:45:00', 'Advisory', 'Advisory', 'Security hardening recommendations', 'HIGH', 'Large', 'active', 'phone', NULL, 3.50, '2025-11-30', 5),
('2025-11-27', '15:30:00', 'Support', 'Hosting', 'Black Friday traffic capacity planning', 'HIGH', 'Medium', 'active', 'ticket', NULL, 2.00, '2025-11-30', 3),
('2025-11-29', '10:00:00', 'Bug Fix', 'Email', 'Unsubscribe link returning 404', 'MEDIUM', 'Small', 'ignored', 'sms', NULL, 0.50, NULL, 2),

-- December 2025
('2025-12-01', '09:00:00', 'New Feature', 'Website', 'Build year-in-review interactive page', 'LOW', 'Large', 'active', 'ticket', 'https://velocity-seo.com', 4.00, '2025-12-31', 1),
('2025-12-03', '11:30:00', 'Bug Fix', 'Website', 'Snow animation crashing older iPhones', 'HIGH', 'Small', 'active', 'sms', 'https://summitfitness.co', 0.75, '2025-12-31', 3),
('2025-12-05', '14:00:00', 'Update', 'Forms', 'Add gift card purchase option to checkout', 'MEDIUM', 'Medium', 'active', 'email', 'https://greenleaforganics.com', 2.50, '2025-12-31', 2),
('2025-12-09', '08:30:00', 'Support', 'Support', 'Reset all staff passwords for new year', 'LOW', 'Small', 'active', 'phone', NULL, 0.50, '2025-12-31', 1),
('2025-12-12', '16:00:00', 'Bug Fix', 'Billing', 'Tax calculation rounding errors on invoices', 'HIGH', 'Medium', 'active', 'ticket', NULL, 2.00, '2025-12-31', 1),
('2025-12-15', '10:15:00', 'Migration', 'Migration', 'Archive old blog posts to static site', 'LOW', 'Medium', 'active', 'email', NULL, 2.00, '2025-12-31', 4),
('2025-12-18', '13:45:00', 'New Feature', 'Email', 'Set up New Year promo automated sequence', 'MEDIUM', 'Medium', 'active', 'sms', NULL, 1.50, '2025-12-31', 2),
('2025-12-22', '09:00:00', 'Update', 'Hosting', 'Year-end server maintenance and updates', 'MEDIUM', 'Medium', 'active', 'ticket', NULL, 2.00, '2025-12-31', 1),
('2025-12-28', '11:00:00', 'Advisory', 'Advisory', '2026 digital strategy roadmap', 'LOW', 'Large', 'active', 'email', NULL, 4.00, '2025-12-31', 1),
('2025-12-30', '15:30:00', 'Support', 'Support', 'Emergency: site down after plugin update', 'HIGH', 'Small', 'active', 'phone', 'https://bluelinemfg.com', 1.00, '2025-12-31', 5),

-- January 2026
('2026-01-06', '08:30:00', 'New Feature', 'Website', 'Implement client portal MVP', 'MEDIUM', 'Large', 'active', 'ticket', 'https://velocity-seo.com', 8.00, '2026-01-31', 1),
('2026-01-08', '10:00:00', 'Bug Fix', 'Forms', 'Contact form CSRF token expiring too quickly', 'HIGH', 'Small', 'active', 'sms', 'https://coastalrealtygroup.com', 1.00, '2026-01-31', 4),
('2026-01-10', '14:30:00', 'Update', 'Website', 'Update copyright year and legal pages', 'LOW', 'Small', 'active', 'email', 'https://greenleaforganics.com', 0.50, '2026-01-31', 2),
('2026-01-13', '09:15:00', 'Support', 'Support', 'Onboard new employee to all platforms', 'LOW', 'Medium', 'active', 'phone', NULL, 1.50, '2026-01-31', 3),
('2026-01-16', '16:00:00', 'New Feature', 'Billing', 'QuickBooks Online integration for invoicing', 'MEDIUM', 'Large', 'active', 'ticket', NULL, 6.00, '2026-01-31', 1),
('2026-01-20', '11:30:00', 'Bug Fix', 'Email', 'Welcome email not triggering for new signups', 'HIGH', 'Medium', 'active', 'sms', NULL, 1.50, '2026-01-31', 2),
('2026-01-23', '13:00:00', 'Update', 'Hosting', 'Migrate to PHP 8.3 across all sites', 'MEDIUM', 'Large', 'active', 'email', NULL, 3.00, '2026-01-31', 1),
('2026-01-27', '08:00:00', 'Advisory', 'Advisory', 'Competitor analysis and market positioning', 'LOW', 'Large', 'active', 'ticket', NULL, 3.50, '2026-01-31', 5),
('2026-01-29', '15:30:00', 'Bug Fix', 'Scripts', 'Hotjar heatmap not recording on SPA pages', 'MEDIUM', 'Small', 'active', 'phone', NULL, 0.75, '2026-01-31', 1),
('2026-01-31', '10:00:00', 'Support', 'Support', 'Domain renewal and DNS health check', 'LOW', 'Small', 'deleted', 'sms', NULL, 0.25, NULL, 4),

-- February 2026
('2026-02-03', '09:00:00', 'New Feature', 'Website', 'Build interactive pricing calculator', 'MEDIUM', 'Large', 'active', 'ticket', 'https://summitfitness.co', 5.00, NULL, 3),
('2026-02-05', '11:15:00', 'Bug Fix', 'Website', 'Dark mode toggle not persisting preference', 'MEDIUM', 'Small', 'active', 'sms', 'https://velocity-seo.com', 0.75, NULL, 1),
('2026-02-07', '14:00:00', 'Update', 'Forms', 'Add Calendly embed to booking form', 'LOW', 'Medium', 'active', 'email', 'https://coastalrealtygroup.com', 1.50, NULL, 4),
('2026-02-10', '08:30:00', 'Support', 'Support', 'Investigate 503 errors on peak traffic', 'HIGH', 'Medium', 'active', 'phone', 'https://greenleaforganics.com', 2.00, NULL, 2),
('2026-02-12', '16:30:00', 'New Feature', 'Email', 'Valentine campaign with dynamic personalization', 'MEDIUM', 'Medium', 'active', 'ticket', NULL, 2.00, NULL, 2),
('2026-02-14', '10:00:00', 'Bug Fix', 'Billing', 'Subscription renewal charge not processing', 'HIGH', 'Medium', 'active', 'sms', NULL, 2.00, NULL, 1),
('2026-02-17', '13:30:00', 'Migration', 'Migration', 'Migrate CRM data from HubSpot to Twenty', 'MEDIUM', 'Large', 'active', 'email', NULL, 5.00, NULL, 1),
('2026-02-19', '09:45:00', 'Update', 'Hosting', 'Set up automated backups for new client sites', 'LOW', 'Medium', 'active', 'ticket', NULL, 1.50, NULL, 5),
('2026-02-21', '15:00:00', 'Advisory', 'Advisory', 'AI integration feasibility assessment', 'MEDIUM', 'Large', 'active', 'email', NULL, 4.00, NULL, 1);

-- ---------------------------------------------------------------------------
-- INVOICES - monthly invoices for Velocity + some for other customers
-- ---------------------------------------------------------------------------
INSERT INTO invoices (customer_id, invoice_number, period_start, period_end, invoice_date, due_date, status, subtotal, tax_rate, tax_amount, total, amount_paid, payment_date, notes) VALUES
-- Velocity monthly invoices
(1, 'VEL-2025-007', '2025-07-01', '2025-07-31', '2025-08-01', '2025-08-31', 'paid',    2125.00, 0, 0, 2125.00, 2125.00, '2025-08-15', 'July 2025 support services'),
(1, 'VEL-2025-008', '2025-08-01', '2025-08-31', '2025-09-01', '2025-10-01', 'paid',    1875.00, 0, 0, 1875.00, 1875.00, '2025-09-20', 'August 2025 support services'),
(1, 'VEL-2025-009', '2025-09-01', '2025-09-30', '2025-10-01', '2025-10-31', 'paid',    2450.00, 0, 0, 2450.00, 2450.00, '2025-10-22', 'September 2025 support services'),
(1, 'VEL-2025-010', '2025-10-01', '2025-10-31', '2025-11-01', '2025-12-01', 'paid',    2800.00, 0, 0, 2800.00, 2800.00, '2025-11-18', 'October 2025 support services'),
(1, 'VEL-2025-011', '2025-11-01', '2025-11-30', '2025-12-01', '2025-12-31', 'paid',    2350.00, 0, 0, 2350.00, 2350.00, '2025-12-10', 'November 2025 support services'),
(1, 'VEL-2025-012', '2025-12-01', '2025-12-31', '2026-01-02', '2026-02-01', 'sent',    1950.00, 0, 0, 1950.00,    0.00, NULL,         'December 2025 support services'),
(1, 'VEL-2026-002', '2026-01-01', '2026-01-31', '2026-02-01', '2026-03-03', 'draft',   3200.00, 0, 0, 3200.00,    0.00, NULL,         'January 2026 support services'),

-- Other customer invoices
(2, 'GLO-2025-003', '2025-07-01', '2025-09-30', '2025-10-01', '2025-10-31', 'paid',     975.00, 0, 0,  975.00,  975.00, '2025-10-28', 'Q3 2025 support - Greenleaf Organics'),
(2, 'GLO-2025-004', '2025-10-01', '2025-12-31', '2026-01-02', '2026-02-01', 'sent',    1250.00, 0, 0, 1250.00,    0.00, NULL,         'Q4 2025 support - Greenleaf Organics'),
(3, 'SFC-2025-002', '2025-07-01', '2025-12-31', '2026-01-02', '2026-02-01', 'overdue', 1575.00, 0, 0, 1575.00,    0.00, NULL,         'H2 2025 support - Summit Fitness'),
(4, 'CRG-2025-001', '2025-07-01', '2025-12-31', '2026-01-05', '2026-02-04', 'sent',    2100.00, 0, 0, 2100.00,    0.00, NULL,         'H2 2025 support - Coastal Realty'),
(5, 'BLM-2025-001', '2025-08-01', '2025-12-31', '2026-01-02', '2026-02-01', 'paid',    1800.00, 0, 0, 1800.00, 1800.00, '2026-01-25', 'Support services - BlueLine Mfg');

-- ---------------------------------------------------------------------------
-- INVOICE ITEMS - line items for each invoice
-- ---------------------------------------------------------------------------
-- VEL-2025-007 (July)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-007'), 'support', 'Bug Fix - Safari navigation dropdown', 2.00, 250.00, 500.00, 1),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-007'), 'support', 'FAQ page update', 0.50, 150.00, 75.00, 2),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-007'), 'support', 'SEO audit and recommendations', 4.00, 175.00, 700.00, 3),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-007'), 'other',   'Free hours credit (10 hrs)', -10.00, 150.00, -1500.00, 4),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-007'), 'hosting', 'Monthly hosting - 5 sites', 5.00, 99.00, 495.00, 5);

-- VEL-2025-008 (August)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'support', 'Testimonials carousel', 2.50, 175.00, 437.50, 1),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'support', 'Stripe v3 payment gateway update', 4.50, 175.00, 787.50, 2),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'support', 'SSL certificate renewals', 0.50, 250.00, 125.00, 3),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'support', 'Quarterly performance review', 3.00, 150.00, 450.00, 4),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'other',   'Free hours credit (10 hrs)', -10.00, 150.00, -1500.00, 5),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-008'), 'hosting', 'Monthly hosting - 5 sites', 5.00, 99.00, 495.00, 6);

-- VEL-2025-009 (September)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-009'), 'support', 'Blog section implementation', 5.00, 175.00, 875.00, 1),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-009'), 'support', 'Recurring invoice automation', 4.00, 175.00, 700.00, 2),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-009'), 'support', 'Server upgrade for traffic spike', 2.00, 250.00, 500.00, 3),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-009'), 'other',   'Free hours credit (10 hrs)', -10.00, 150.00, -1500.00, 4),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-009'), 'hosting', 'Monthly hosting - 5 sites', 5.00, 99.00, 495.00, 5);

-- VEL-2025-010 (October)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-010'), 'support', 'Invoice PDF date fix', 1.50, 250.00, 375.00, 1),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-010'), 'support', 'VPS hosting migration (5 sites)', 6.00, 175.00, 1050.00, 2),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-010'), 'support', 'Annual strategy planning', 3.00, 150.00, 450.00, 3),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-010'), 'other',   'Free hours credit (10 hrs)', -10.00, 150.00, -1500.00, 4),
((SELECT id FROM invoices WHERE invoice_number='VEL-2025-010'), 'hosting', 'Monthly hosting - 5 sites', 5.00, 99.00, 495.00, 5);

-- GLO-2025-003 (Q3 Greenleaf)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='GLO-2025-003'), 'support', 'Contact form file upload', 1.50, 175.00, 262.50, 1),
((SELECT id FROM invoices WHERE invoice_number='GLO-2025-003'), 'support', 'Autoresponder duplicate fix', 1.00, 250.00, 250.00, 2),
((SELECT id FROM invoices WHERE invoice_number='GLO-2025-003'), 'support', 'Form validation mobile fix', 1.00, 250.00, 250.00, 3),
((SELECT id FROM invoices WHERE invoice_number='GLO-2025-003'), 'support', 'Fall email template updates', 1.50, 150.00, 225.00, 4);

-- SFC-2025-002 (H2 Summit Fitness)
INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount, sort_order) VALUES
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'support', 'Hero banner swap', 0.50, 150.00, 75.00, 1),
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'support', 'Image lazy loading fix', 0.75, 175.00, 131.25, 2),
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'support', 'Multi-step lead capture form', 3.50, 175.00, 612.50, 3),
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'support', 'Snow animation crash fix', 0.75, 250.00, 187.50, 4),
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'support', 'Black Friday capacity planning', 2.00, 250.00, 500.00, 5),
((SELECT id FROM invoices WHERE invoice_number='SFC-2025-002'), 'hosting', 'Monthly hosting (6 months)', 6.00, 99.00, 594.00, 6);

-- ---------------------------------------------------------------------------
-- FLUENT TICKETS - linked to some requests
-- ---------------------------------------------------------------------------
INSERT INTO fluent_tickets (fluent_id, ticket_number, created_at, ticket_status, customer_id, customer_name, customer_email, mailbox_id, title, priority, agent_name, client_id) VALUES
('FT-2001', '#2001', '2025-10-02 09:00:00', 'closed', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Property listing search feature request', 'normal', 'Justin', 1),
('FT-2002', '#2002', '2025-10-03 11:00:00', 'closed', 'greenleaf-001', 'Sarah', 'sarah@greenleaforganics.com', 1, 'Contact form emails going to spam', 'high', 'Justin', 2),
('FT-2003', '#2003', '2025-10-14 16:15:00', 'closed', 'summit-001', 'Mike', 'mike@summitfitness.co', 1, 'Need multi-step form for lead capture', 'normal', 'Justin', 3),
('FT-2004', '#2004', '2025-10-17 10:30:00', 'closed', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Invoice dates are wrong in PDF export', 'high', 'Justin', 1),
('FT-2005', '#2005', '2025-11-03 08:15:00', 'closed', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Event calendar with RSVP', 'normal', 'Justin', 1),
('FT-2006', '#2006', '2025-11-11 09:30:00', 'closed', 'greenleaf-001', 'Sarah', 'sarah@greenleaforganics.com', 1, 'WooCommerce checkout errors', 'high', 'Justin', 2),
('FT-2007', '#2007', '2025-11-24 08:45:00', 'closed', 'blueline-001', 'Dan', 'dan@bluelinemfg.com', 1, 'Security hardening needed', 'high', 'Justin', 5),
('FT-2008', '#2008', '2025-12-01 09:00:00', 'closed', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Year in review interactive page', 'normal', 'Justin', 1),
('FT-2009', '#2009', '2025-12-12 16:00:00', 'closed', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Tax calculation rounding errors', 'high', 'Justin', 1),
('FT-2010', '#2010', '2025-12-30 15:30:00', 'closed', 'blueline-001', 'Dan', 'dan@bluelinemfg.com', 1, 'URGENT: Site down after plugin update', 'critical', 'Justin', 5),
('FT-2011', '#2011', '2026-01-06 08:30:00', 'active', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Client portal MVP project', 'normal', 'Justin', 1),
('FT-2012', '#2012', '2026-01-08 10:00:00', 'closed', 'coastal-001', 'Amy', 'amy@coastalrealtygroup.com', 1, 'CSRF token expiring too fast', 'high', 'Justin', 4),
('FT-2013', '#2013', '2026-01-16 16:00:00', 'active', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'QuickBooks Online integration', 'normal', 'Justin', 1),
('FT-2014', '#2014', '2026-02-10 08:30:00', 'active', 'greenleaf-001', 'Sarah', 'sarah@greenleaforganics.com', 1, '503 errors during peak traffic', 'high', 'Justin', 2),
('FT-2015', '#2015', '2026-02-14 10:00:00', 'active', 'velocity-001', 'Thad', 'thad@velocity-seo.com', 1, 'Subscription renewal charge issue', 'high', 'Justin', 1);

-- ---------------------------------------------------------------------------
-- CLIENT WEBSITE LINKS
-- ---------------------------------------------------------------------------
INSERT INTO client_website_links (client_id, twenty_website_property_id, website_url, website_name, hosting_status) VALUES
(1, 'wp-vel-001', 'https://velocity-seo.com', 'Velocity SEO Main Site', 'active'),
(1, 'wp-vel-002', 'https://blog.velocity-seo.com', 'Velocity Blog', 'active'),
(2, 'wp-glo-001', 'https://greenleaforganics.com', 'Greenleaf Organics Store', 'active'),
(3, 'wp-sfc-001', 'https://summitfitness.co', 'Summit Fitness Main', 'active'),
(3, 'wp-sfc-002', 'https://members.summitfitness.co', 'Summit Members Portal', 'active'),
(4, 'wp-crg-001', 'https://coastalrealtygroup.com', 'Coastal Realty Group', 'active'),
(4, 'wp-crg-002', 'https://listings.coastalrealtygroup.com', 'CRG Listings', 'pending'),
(5, 'wp-blm-001', 'https://bluelinemfg.com', 'BlueLine Manufacturing', 'active');

-- ---------------------------------------------------------------------------
-- CLIENT PROJECT LINKS
-- ---------------------------------------------------------------------------
INSERT INTO client_project_links (client_id, twenty_project_id, project_name, project_status) VALUES
(1, 'proj-vel-001', 'Website Redesign 2025', 'completed'),
(1, 'proj-vel-002', 'Client Portal MVP', 'in_progress'),
(1, 'proj-vel-003', 'QBO Integration', 'planning'),
(2, 'proj-glo-001', 'WooCommerce Store Upgrade', 'completed'),
(2, 'proj-glo-002', 'Email Marketing Overhaul', 'in_progress'),
(3, 'proj-sfc-001', 'Lead Capture Funnel', 'review'),
(4, 'proj-crg-001', 'Property Search Build', 'in_progress'),
(5, 'proj-blm-001', 'Hosting Migration', 'completed'),
(5, 'proj-blm-002', 'Security Hardening', 'on_hold');

-- ---------------------------------------------------------------------------
-- FLUENT SYNC STATUS - show a successful sync
-- ---------------------------------------------------------------------------
INSERT INTO fluent_sync_status (last_sync_at, last_sync_status, tickets_fetched, tickets_added, tickets_updated, tickets_skipped, sync_duration_ms, date_filter)
VALUES (NOW(), 'success', 35, 15, 5, 15, 4200, '2025-09-20');

-- ---------------------------------------------------------------------------
-- CLIENT USERS - add portal users for new clients
-- ---------------------------------------------------------------------------
INSERT INTO client_users (client_id, email, password_hash, name, is_active) VALUES
(2, 'sarah@greenleaforganics.com', '$2a$10$KMBkspHeKPOtivINLTxaZ./ywjqI8szFZQAX5BThIDkybvx14v0uW', 'Sarah Green', TRUE),
(3, 'mike@summitfitness.co', '$2a$10$KMBkspHeKPOtivINLTxaZ./ywjqI8szFZQAX5BThIDkybvx14v0uW', 'Mike Summit', TRUE),
(4, 'amy@coastalrealtygroup.com', '$2a$10$KMBkspHeKPOtivINLTxaZ./ywjqI8szFZQAX5BThIDkybvx14v0uW', 'Amy Coastal', TRUE),
(5, 'dan@bluelinemfg.com', '$2a$10$KMBkspHeKPOtivINLTxaZ./ywjqI8szFZQAX5BThIDkybvx14v0uW', 'Dan BlueLine', TRUE);
