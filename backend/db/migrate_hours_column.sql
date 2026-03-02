-- Migration script to convert estimated_hours from generated column to regular column
-- This allows manual editing of hours while preserving existing calculated values

USE velocity_billing;

-- Step 1: Create a temporary column to hold current values
ALTER TABLE requests ADD COLUMN estimated_hours_temp DECIMAL(4, 2);

-- Step 2: Copy current calculated values to temp column
UPDATE requests SET estimated_hours_temp = estimated_hours;

-- Step 3: Drop the generated column
ALTER TABLE requests DROP COLUMN estimated_hours;

-- Step 4: Add new regular column with proper definition
ALTER TABLE requests ADD COLUMN estimated_hours DECIMAL(4, 2) DEFAULT 0.50;

-- Step 5: Copy values back from temp column
UPDATE requests SET estimated_hours = estimated_hours_temp;

-- Step 6: Drop temporary column
ALTER TABLE requests DROP COLUMN estimated_hours_temp;

-- Step 7: Update any NULL values to defaults based on effort
UPDATE requests
SET estimated_hours = CASE
    WHEN effort = 'Small' THEN 0.25
    WHEN effort = 'Large' THEN 1.00
    ELSE 0.50
END
WHERE estimated_hours IS NULL;

-- Verify the change
DESCRIBE requests;
SELECT id, effort, estimated_hours FROM requests LIMIT 10;