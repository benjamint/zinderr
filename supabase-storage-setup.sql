-- Supabase Storage Setup for Zinderr
-- Run this in your Supabase SQL Editor

-- Step 1: Create the storage bucket for errand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('errands', 'errands', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies for the errands bucket

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload errand images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'errands' AND
  (storage.foldername(name))[1] = 'errand-images'
);

-- Allow public to view errand images
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

-- Allow authenticated users to delete their uploaded images
CREATE POLICY "Allow users to delete their errand images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'errands');

-- Success message
SELECT 'Supabase Storage setup completed successfully!' as status;
