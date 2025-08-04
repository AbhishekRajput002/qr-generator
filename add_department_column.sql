-- Add department column to existing computers table
USE computer_qr_db;

-- Add department column if it doesn't exist
ALTER TABLE computers ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Update existing records to have a default department value
UPDATE computers SET department = 'Not specified' WHERE department IS NULL OR department = ''; 