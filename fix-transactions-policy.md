# 🔧 Fix for Transactions RLS Policy

## The Problem
When a poster tries to rate a runner after an errand is completed, the app tries to create a transaction record, but it fails with:
```
Error: new row violates row-level security policy for table "transactions"
```

## The Solution
We need to add an RLS policy that allows users to insert transactions when they're involved in the errand.

## Step 1: Add the Missing RLS Policy
Go to your Supabase SQL Editor and run this:

```sql
-- Add policy to allow users to insert transactions for their errands
CREATE POLICY "Users can insert transactions for their errands"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM errands 
      WHERE errands.id = errand_id 
      AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
    )
  );
```

## Step 2: Test the Fix
1. Go back to your app: http://localhost:5173
2. Try the rating flow again
3. The error should be resolved

## Alternative: Complete Transactions Policy Update
If you want to be more comprehensive, run this instead:

```sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

-- Create comprehensive policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (poster_id = auth.uid() OR runner_id = auth.uid());

CREATE POLICY "Users can insert transactions for their errands"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM errands 
      WHERE errands.id = errand_id 
      AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (poster_id = auth.uid() OR runner_id = auth.uid());
```

## What This Fixes
- ✅ **Posters can create transactions** when rating runners
- ✅ **Runners can create transactions** when rating posters
- ✅ **Users can view their own transactions**
- ✅ **Rating system works properly**

## Test the Fix
After running the SQL:
1. **Complete an errand** (mark as completed)
2. **Try to rate** the other user
3. **Should work without errors** now

## Success Indicators
- ✅ No more "row-level security policy" errors
- ✅ Rating submission works
- ✅ Transaction records are created properly
- ✅ Rating appears in the system
