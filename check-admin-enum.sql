-- Check current user_type enum values
-- Run this first to see what values exist

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_type')
ORDER BY enumsortorder;

-- If 'admin' already exists, you can skip the enum modification
-- If it doesn't exist, use the safe setup script
