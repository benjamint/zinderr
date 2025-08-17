# Testing the Rating System

## Quick Test Steps:

### 1. Run the Database Fix
Execute this SQL in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of fix-rating-counter.sql
```

### 2. Check Current Rating Statistics
```sql
-- See current rating counts for all users
SELECT 
  id, 
  full_name, 
  total_ratings, 
  average_rating, 
  last_rating_update 
FROM profiles 
WHERE total_ratings > 0 
ORDER BY total_ratings DESC;
```

### 3. Test Rating Submission
1. **Complete an errand** (mark as completed)
2. **Submit a rating** through the MutualRatingModal
3. **Check the console** for any errors
4. **Verify the rating was created** in the database

### 4. Check Rating Count Updates
```sql
-- Check if the rating was created
SELECT * FROM mutual_ratings ORDER BY created_at DESC LIMIT 5;

-- Check if user statistics were updated
SELECT 
  id, 
  full_name, 
  total_ratings, 
  average_rating 
FROM profiles 
WHERE id = 'USER_ID_HERE'; -- Replace with actual user ID
```

## Expected Behavior:

### ✅ After Submitting a Rating:
- **Rating is created** in `mutual_ratings` table
- **User's `total_ratings` increases** by 1
- **User's `average_rating` updates** to new average
- **`last_rating_update` timestamp** is updated

### ✅ Rating Visibility:
- **New ratings are hidden** (`is_hidden = true`)
- **Hidden for 24 hours** (`hidden_until` timestamp)
- **Only visible ratings count** toward statistics
- **Hidden ratings don't affect** `total_ratings` or `average_rating`

## Debugging Commands:

### Check Triggers:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'mutual_ratings';
```

### Check Function:
```sql
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_user_rating_statistics';
```

### Manual Rating Reveal:
```sql
-- Reveal all hidden ratings (for testing)
UPDATE mutual_ratings 
SET is_hidden = false, hidden_until = null 
WHERE is_hidden = true;

-- Then check if statistics updated
SELECT 
  id, 
  full_name, 
  total_ratings, 
  average_rating 
FROM profiles;
```

## Common Issues:

### Issue 1: Triggers Not Created
**Solution**: Run the SQL script again and check for errors

### Issue 2: Rating Fields Missing
**Solution**: The script automatically adds missing columns

### Issue 3: Statistics Not Updating
**Solution**: Check if triggers are firing and functions exist

### Issue 4: Hidden Ratings Not Counting
**Solution**: This is correct behavior - only visible ratings count

## Test Data:

### Create Test Rating:
```sql
-- Insert a test rating (replace with actual IDs)
INSERT INTO mutual_ratings (
  transaction_id,
  errand_id,
  rater_id,
  rated_id,
  rating,
  rating_type,
  is_hidden,
  hidden_until
) VALUES (
  'TRANSACTION_ID',
  'ERRAND_ID', 
  'RATER_ID',
  'RATED_ID',
  5,
  'poster_to_runner',
  false,
  null
);
```

## Verification:

After running the fix:
1. ✅ **Triggers exist** for `mutual_ratings` table
2. ✅ **Functions exist** for updating statistics
3. ✅ **Rating submission works** without errors
4. ✅ **User statistics update** automatically
5. ✅ **Hidden ratings work** correctly
6. ✅ **24-hour reveal system** functions properly

The rating counter should now work perfectly! 🎯
