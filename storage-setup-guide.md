# 🗂️ Supabase Storage Setup Guide

## Problem
The image upload is failing with "Bucket not found" error because the Supabase Storage bucket hasn't been created yet.

## Solution Options

### Option 1: SQL Script (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-storage-setup.sql`
4. Click **Run** to execute the script

### Option 2: Manual Setup via Dashboard

#### Step 1: Create Storage Bucket
1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Enter the following details:
   - **Name**: `errands`
   - **Public bucket**: ✅ Check this box
   - **File size limit**: `50MB` (or your preferred limit)
   - **Allowed MIME types**: `image/*`
5. Click **Create bucket**

#### Step 2: Set Up Storage Policies
1. In the **Storage** section, click on the `errands` bucket
2. Go to the **Policies** tab
3. Click **New Policy**
4. Add the following policies:

**Policy 1: Upload Images**
- **Policy name**: `Allow authenticated users to upload errand images`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'errands' AND
(storage.foldername(name))[1] = 'errand-images'
```

**Policy 2: View Images**
- **Policy name**: `Allow public to view errand images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**:
```sql
bucket_id = 'errands'
```

**Policy 3: Update Images**
- **Policy name**: `Allow users to update their errand images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'errands'
```

**Policy 4: Delete Images**
- **Policy name**: `Allow users to delete their errand images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'errands'
```

## Verification Steps

### 1. Test Bucket Creation
After setup, you should see:
- A bucket named `errands` in your Storage dashboard
- The bucket should be marked as "Public"

### 2. Test Image Upload
1. Try uploading an image when posting an errand
2. Check the browser console for any errors
3. Verify the image appears in the Supabase Storage dashboard

### 3. Test Image Display
1. Create an errand with an image
2. Verify the image displays correctly in the errand card
3. Check that the image URL is accessible

## Troubleshooting

### Common Issues:

**1. "Bucket not found" error persists**
- Ensure the bucket name is exactly `errands` (lowercase)
- Check that the bucket is created in the correct project

**2. "Permission denied" error**
- Verify all storage policies are created correctly
- Check that the user is authenticated

**3. Images not displaying**
- Verify the bucket is set to "Public"
- Check that the image URLs are accessible

**4. Upload fails**
- Check file size limits
- Verify MIME type restrictions
- Ensure the user is authenticated

## Next Steps

After setting up the storage bucket:

1. **Test the image upload** in your app
2. **Verify images display** correctly
3. **Check the edit functionality** with images
4. **Test on different devices** to ensure responsiveness

The image upload should work perfectly once the storage bucket is properly configured! 🎉
