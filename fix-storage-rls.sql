-- Fix Supabase Storage RLS Policies for Image Uploads
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their errand images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their errand images" ON storage.objects;

-- Step 2: Create comprehensive storage policies

-- Allow authenticated users to upload images to the errands bucket
CREATE POLICY "Allow authenticated users to upload errand images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'errands' AND
  (storage.foldername(name))[1] = 'errand-images'
);

-- Allow public to view errand images (for displaying in the app)
CREATE POLICY "Allow public to view errand images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'errands');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Allow users to update their errand images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'errands')
WITH CHECK (bucket_id = 'errands');

-- Allow authenticated users to delete their errand images
CREATE POLICY "Allow users to delete their errand images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'errands');

-- Step 3: Ensure the errands bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('errands', 'errands', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  name = 'errands';

-- Step 4: Create a more permissive policy for authenticated users (if needed)
CREATE POLICY "Allow authenticated users full access to errands bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'errands')
WITH CHECK (bucket_id = 'errands');

-- Success message
SELECT 'Storage RLS policies updated successfully!' as status;
