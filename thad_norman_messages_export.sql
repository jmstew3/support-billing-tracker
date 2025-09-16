-- Messages export for Thad Norman (+1 980-395-4161)
-- Date range: May 1, 2025 - July 14, 2025
-- Export date: 2025-07-14

CREATE TABLE IF NOT EXISTS messages_export (
    message_date TEXT,
    sender TEXT,
    message_text TEXT,
    service_type TEXT,
    delivery_status TEXT,
    read_status TEXT
);

INSERT INTO messages_export (message_date, sender, message_text, service_type, delivery_status, read_status) VALUES
('2025-06-02 10:24:08', 'Me', '[No text content]', 'RCS', 'Delivered', 'Unread');

-- Summary: 1 message found in the specified date range