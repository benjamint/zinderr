-- Simple Storage Fix - Most Permissive Policy
-- Run this in your Supabase SQL Editor if the other fix doesn't work

-- Step 1: Drop ALL existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users full access to errands bucket" ON storage.objects;

-- Step 2: Create a simple, permissive policy for authenticated users
CREATE POLICY "Allow authenticated users to upload any file"
ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Ensure the errands bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('errands', 'errands', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  name = 'errands';

-- Success message
SELECT 'Simple storage policy applied successfully!' as status;
