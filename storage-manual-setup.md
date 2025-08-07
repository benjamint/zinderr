# 🔧 Manual Supabase Storage Setup

If the SQL scripts don't work, follow these manual steps:

## **Step 1: Create Storage Bucket**

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Set the following:
   - **Name**: `errands`
   - **Public bucket**: ✅ **Check this box**
   - **File size limit**: `50MB` (or your preferred limit)
   - **Allowed MIME types**: `image/*` (or leave empty for all types)
5. Click **"Create bucket"**

## **Step 2: Set Storage Policies**

1. In the **Storage** section, click on the **`errands`** bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"**
4. Choose **"Create a policy from scratch"**
5. Set the following:

### **Policy 1: Allow Uploads (INSERT)**
- **Policy name**: `Allow authenticated uploads`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'errands')
```
- **Operation**: Select **"INSERT"** from the dropdown
- Click **"Review"** then **"Save policy"**

### **Policy 2: Allow Updates (UPDATE)**
- **Policy name**: `Allow authenticated updates`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'errands')
```
- **Operation**: Select **"UPDATE"** from the dropdown
- Click **"Review"** then **"Save policy"**

### **Policy 3: Allow Deletes (DELETE)**
- **Policy name**: `Allow authenticated deletes`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'errands')
```
- **Operation**: Select **"DELETE"** from the dropdown
- Click **"Review"** then **"Save policy"**

### **Policy 4: Allow Public Viewing (SELECT)**
- **Policy name**: `Allow public viewing`
- **Target roles**: `public`
- **Policy definition**:
```sql
(bucket_id = 'errands')
```
- **Operation**: Select **"SELECT"** from the dropdown
- Click **"Review"** then **"Save policy"**

## **Alternative: Use Policy Templates**

If the above doesn't work, try using policy templates:

1. Click **"New Policy"**
2. Choose **"Use a template"**
3. Select **"Enable read access to everyone"** for public viewing
4. Select **"Enable insert for authenticated users only"** for uploads
5. Select **"Enable update for authenticated users only"** for updates
6. Select **"Enable delete for authenticated users only"** for deletes

## **Step 3: Test Upload**

1. Go to your app and try uploading an image
2. If it still doesn't work, try the **Simple Storage Fix** SQL script

## **Alternative: Disable RLS (Not Recommended for Production)**

If you're still having issues, you can temporarily disable RLS:

1. Go to **Storage** → **`errands`** bucket
2. Click **"Settings"**
3. Toggle **"Row Level Security (RLS)"** to **OFF**
4. **⚠️ Warning**: This is less secure, only use for testing

## **Troubleshooting**

### **Common Issues:**

1. **"Bucket not found"**
   - Make sure the bucket name is exactly `errands`
   - Check that the bucket exists in your Supabase project

2. **"Permission denied"**
   - Ensure the user is authenticated
   - Check that RLS policies are correctly set
   - Try the simple storage fix SQL script

3. **"File too large"**
   - Increase the file size limit in bucket settings
   - Or compress the image before upload

4. **"Operation option missing"**
   - The interface might have changed
   - Try using policy templates instead
   - Or use the SQL script approach

### **Test the Fix:**

After applying the fix, try uploading an image in your app. The upload should work without any RLS errors.

## **Security Note:**

The simple storage fix allows all authenticated users to upload any file to the bucket. For production, you might want to add more specific restrictions based on your security requirements.

## **Quick SQL Fix (Recommended)**

If manual setup is confusing, just run this in your Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload any file" ON storage.objects;

-- Create simple permissive policy
CREATE POLICY "Allow authenticated users to upload any file"
ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('errands', 'errands', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  name = 'errands';
```
