-- Seed data for velocity_billing
-- Run after schema.sql to populate initial test data

USE velocity_billing;

-- Clear existing data for fresh seed
TRUNCATE TABLE requests;

-- Insert sample requests covering various categories, urgencies, and dates
INSERT INTO requests (date, time, request_type, category, description, urgency, effort, status, source, website_url, estimated_hours, billing_date) VALUES
-- January 2025
('2025-01-08', '09:15:00', 'Bug Fix', 'Brand Website', 'Homepage hero image not loading on mobile devices', 'HIGH', 'Small', 'active', 'ticket', 'https://example-brand.com', 1.00, '2025-01-31'),
('2025-01-12', '14:30:00', 'Feature Request', 'Brand Website', 'Add newsletter signup popup to homepage', 'MEDIUM', 'Medium', 'active', 'email', 'https://example-brand.com', 2.50, '2025-01-31'),
('2025-01-15', '10:00:00', 'Content Update', 'Landing Page', 'Update pricing section with new Q1 rates', 'LOW', 'Small', 'active', 'sms', 'https://promo.example.com', 0.50, '2025-01-31'),
('2025-01-20', '16:45:00', 'Bug Fix', 'Multi-Brand', 'Contact form submissions not reaching email', 'HIGH', 'Medium', 'active', 'fluent', NULL, 3.00, '2025-01-31'),

-- February 2025
('2025-02-03', '11:20:00', 'Design Update', 'Brand Website', 'Refresh about page with new team photos', 'MEDIUM', 'Medium', 'active', 'ticket', 'https://company-site.com', 2.00, '2025-02-28'),
('2025-02-10', '08:30:00', 'Performance', 'Brand Website', 'Page load speed optimization needed', 'HIGH', 'Large', 'active', 'email', 'https://company-site.com', 5.00, '2025-02-28'),
('2025-02-14', '13:00:00', 'Content Update', 'Landing Page', 'Valentine promotion banner update', 'HIGH', 'Small', 'active', 'sms', 'https://valentines.example.com', 0.50, '2025-02-28'),
('2025-02-18', '09:45:00', 'Bug Fix', 'Multi-Brand', 'Shopping cart not persisting across pages', 'HIGH', 'Large', 'active', 'fluent', NULL, 4.50, '2025-02-28'),
('2025-02-25', '15:30:00', 'Feature Request', 'Brand Website', 'Add live chat widget integration', 'MEDIUM', 'Medium', 'active', 'ticket', 'https://service-brand.com', 3.00, NULL),

-- March 2025
('2025-03-05', '10:15:00', 'SEO Update', 'Brand Website', 'Update meta tags and descriptions site-wide', 'MEDIUM', 'Medium', 'active', 'email', 'https://seo-client.com', 2.50, '2025-03-31'),
('2025-03-08', '14:00:00', 'Bug Fix', 'Landing Page', 'Form validation not working in Safari', 'HIGH', 'Small', 'active', 'ticket', 'https://landing.example.com', 1.50, '2025-03-31'),
('2025-03-12', '11:30:00', 'Content Update', 'Multi-Brand', 'Update product catalog with spring collection', 'MEDIUM', 'Large', 'active', 'fluent', NULL, 6.00, '2025-03-31'),
('2025-03-18', '16:00:00', 'Feature Request', 'Brand Website', 'Add customer testimonials section', 'LOW', 'Medium', 'active', 'sms', 'https://testimonial-site.com', 2.00, NULL),
('2025-03-22', '09:00:00', 'Security Update', 'Multi-Brand', 'SSL certificate renewal and HTTPS enforcement', 'HIGH', 'Small', 'active', 'email', NULL, 1.00, '2025-03-31'),

-- April 2025
('2025-04-02', '13:45:00', 'Bug Fix', 'Brand Website', 'Footer links broken after recent deployment', 'MEDIUM', 'Small', 'active', 'ticket', 'https://footer-fix.com', 0.75, '2025-04-30'),
('2025-04-08', '10:30:00', 'Design Update', 'Landing Page', 'Redesign CTA buttons for better conversion', 'MEDIUM', 'Medium', 'active', 'email', 'https://cta-landing.com', 2.00, '2025-04-30'),
('2025-04-15', '15:15:00', 'Feature Request', 'Multi-Brand', 'Implement abandoned cart email notifications', 'HIGH', 'Large', 'active', 'fluent', NULL, 8.00, NULL),
('2025-04-20', '08:45:00', 'Content Update', 'Brand Website', 'Add new blog posts about industry trends', 'LOW', 'Medium', 'active', 'sms', 'https://blog-site.com', 1.50, '2025-04-30'),

-- May 2025
('2025-05-05', '11:00:00', 'Performance', 'Multi-Brand', 'Database query optimization for product pages', 'HIGH', 'Large', 'active', 'ticket', NULL, 6.00, '2025-05-31'),
('2025-05-10', '14:30:00', 'Bug Fix', 'Landing Page', 'Mobile responsive issues on checkout page', 'HIGH', 'Medium', 'active', 'email', 'https://checkout.example.com', 3.00, '2025-05-31'),
('2025-05-15', '09:20:00', 'Design Update', 'Brand Website', 'Update color scheme to match new branding', 'MEDIUM', 'Large', 'active', 'fluent', 'https://rebrand-site.com', 5.00, NULL),
('2025-05-22', '16:45:00', 'Feature Request', 'Brand Website', 'Add social media feed integration', 'LOW', 'Medium', 'active', 'sms', 'https://social-site.com', 2.50, '2025-05-31'),

-- June 2025
('2025-06-03', '10:00:00', 'Content Update', 'Landing Page', 'Summer promotion campaign page setup', 'HIGH', 'Medium', 'active', 'ticket', 'https://summer-promo.com', 3.00, '2025-06-30'),
('2025-06-08', '13:15:00', 'Bug Fix', 'Multi-Brand', 'Payment gateway integration error', 'HIGH', 'Large', 'active', 'email', NULL, 5.50, '2025-06-30'),
('2025-06-12', '11:45:00', 'SEO Update', 'Brand Website', 'Implement structured data markup', 'MEDIUM', 'Medium', 'active', 'fluent', 'https://structured-data.com', 2.00, NULL),
('2025-06-18', '15:30:00', 'Feature Request', 'Landing Page', 'Add countdown timer for limited offer', 'MEDIUM', 'Small', 'active', 'sms', 'https://countdown-offer.com', 1.00, '2025-06-30'),
('2025-06-25', '09:30:00', 'Design Update', 'Brand Website', 'Redesign product gallery with lightbox', 'LOW', 'Medium', 'active', 'ticket', 'https://gallery-site.com', 2.50, NULL),

-- Some deleted/ignored entries for realistic data
('2025-03-01', '12:00:00', 'General Request', 'Support', 'Duplicate request - already resolved', 'LOW', 'Small', 'deleted', 'sms', NULL, 0.25, NULL),
('2025-04-10', '14:00:00', 'General Request', 'Support', 'Out of scope request', 'LOW', 'Small', 'ignored', 'email', NULL, 0.25, NULL),

-- Promotional entries
('2025-02-01', '10:00:00', 'Promotion', 'Landing Page', 'February flash sale landing page', 'PROMOTION', 'Medium', 'active', 'ticket', 'https://flash-sale.com', 2.00, '2025-02-28'),
('2025-05-01', '09:00:00', 'Promotion', 'Multi-Brand', 'Memorial Day weekend promotion', 'PROMOTION', 'Large', 'active', 'email', NULL, 4.00, '2025-05-31');

-- Verify insertion
SELECT
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_requests,
  COUNT(DISTINCT category) as categories,
  COUNT(DISTINCT month) as months_covered
FROM requests;
