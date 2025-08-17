# Testing Supabase Real-time Connection

## Quick Test Steps:

### 1. Check Browser Console
Open your browser's developer console and look for:
- ✅ "Supabase connection successful!" message
- ❌ Any real-time connection errors

### 2. Test Real-time Updates
1. **Open Runner Dashboard** in one browser tab
2. **Open Poster Dashboard** in another browser tab
3. **Create a new errand** in Poster Dashboard
4. **Check if it appears** immediately in Runner Dashboard
5. **Delete an errand** in Poster Dashboard
6. **Check if it disappears** immediately in Runner Dashboard

### 3. Manual Refresh Test
1. **Click the "Refresh" button** in Runner Dashboard
2. **Verify errands list updates** correctly

## Common Issues & Solutions:

### Issue: Real-time not working
**Solution**: Check if Supabase real-time is enabled in your project settings

### Issue: RLS policies blocking real-time
**Solution**: Ensure the DELETE policy is added:
```sql
CREATE POLICY "Posters can delete own errands" 
ON errands 
FOR DELETE 
TO authenticated 
USING (poster_id = auth.uid());
```

### Issue: Browser blocking real-time
**Solution**: Check if WebSocket connections are allowed

## Expected Behavior:
- ✅ **New errands appear instantly** in runner dashboard
- ✅ **Deleted errands disappear instantly** from runner dashboard
- ✅ **Updated errands reflect changes immediately**
- ✅ **Manual refresh button works** as backup

## Debug Commands:
```sql
-- Check if DELETE policy exists
SELECT * FROM pg_policies WHERE tablename = 'errands' AND cmd = 'DELETE';

-- Check real-time status
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%supabase%';
```
