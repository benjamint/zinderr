-- Fix: Add missing DELETE policy for errands table
-- This allows posters to delete their own errands

-- Add DELETE policy for errands
CREATE POLICY "Posters can delete own errands" 
ON errands 
FOR DELETE 
TO authenticated 
USING (poster_id = auth.uid());

-- Verify the policy was created
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
AND cmd = 'DELETE';
