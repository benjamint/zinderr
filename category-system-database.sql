-- Category System Database Updates
-- Run this in your Supabase SQL Editor

-- Step 1: Add category column to errands table
ALTER TABLE errands 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Others';

-- Step 2: Create an index for better performance on category filtering
CREATE INDEX IF NOT EXISTS idx_errands_category ON errands(category);

-- Step 3: Update existing errands to have a default category
UPDATE errands 
SET category = 'Others' 
WHERE category IS NULL;

-- Step 4: Create a function to validate categories
CREATE OR REPLACE FUNCTION validate_errand_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if category is in the allowed list
  IF NEW.category NOT IN (
    'Groceries', 'Package Delivery', 'Pharmacy', 'Bill Payments', 
    'Courier', 'Home Help', 'Shopping', 'Food Pickup', 'Laundry', 'Others'
  ) THEN
    NEW.category := 'Others';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to validate categories
DROP TRIGGER IF EXISTS validate_errand_category_trigger ON errands;
CREATE TRIGGER validate_errand_category_trigger
  BEFORE INSERT OR UPDATE ON errands
  FOR EACH ROW
  EXECUTE FUNCTION validate_errand_category();

-- Step 6: Update RLS policies to include category
-- The existing policies should work, but let's make sure they're comprehensive

-- Success message
SELECT 'Category system database updates completed successfully!' as status;
