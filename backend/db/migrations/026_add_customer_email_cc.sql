-- Add email_cc column for CC recipients on QBO invoices
ALTER TABLE customers ADD COLUMN email_cc VARCHAR(255) AFTER email;

-- Set Velocity customer emails
UPDATE customers
SET email = 'thad@velocity-seo.com',
    email_cc = 'tinanorman57@gmail.com'
WHERE name LIKE 'Velocity Business Automation%';
