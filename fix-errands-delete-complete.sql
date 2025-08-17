-- Complete fix for errand delete functionality
-- This script addresses both RLS policies and any potential schema issues

-- 1. First, check if the DELETE policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'errands' 
    AND cmd = 'DELETE'
  ) THEN
    -- Add DELETE policy for errands
    CREATE POLICY "Posters can delete own errands" 
    ON errands 
    FOR DELETE 
    TO authenticated 
    USING (poster_id = auth.uid());
    
    RAISE NOTICE 'DELETE policy created for errands table';
  ELSE
    RAISE NOTICE 'DELETE policy already exists for errands table';
  END IF;
END $$;

-- 2. Verify all errands policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'errands'
ORDER BY cmd;

-- 3. Check if there are any foreign key constraints that might prevent deletion
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'errands';

-- 4. Ensure RLS is enabled on errands table
ALTER TABLE errands ENABLE ROW LEVEL SECURITY;

-- 5. Test the delete functionality (optional - run this manually)
-- INSERT INTO errands (poster_id, title, description, location, amount, category) 
-- VALUES (auth.uid(), 'Test Errand', 'Test Description', 'Test Location', 10.00, 'Others');
-- 
-- DELETE FROM errands WHERE title = 'Test Errand';
