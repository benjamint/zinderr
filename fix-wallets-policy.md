# 🔧 Fix for Wallets RLS Policy

## The Problem
When a rating is submitted, the system tries to create or update wallet entries for runners, but it fails with:
```
Error: new row violates row-level security policy for table "wallets"
```

## The Solution
We need to add RLS policies that allow the system to create and update wallet entries for runners.

## Step 1: Add the Missing RLS Policies
Go to your Supabase SQL Editor and run this:

```sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Runners can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Runners can update their own wallet" ON wallets;

-- Create comprehensive policies for wallets
CREATE POLICY "Runners can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (runner_id = auth.uid());

CREATE POLICY "Runners can insert their own wallet"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (runner_id = auth.uid());

CREATE POLICY "Runners can update their own wallet"
  ON wallets
  FOR UPDATE
  TO authenticated
  USING (runner_id = auth.uid());

-- Also allow system to create wallets for runners (for triggers)
CREATE POLICY "System can manage wallets"
  ON wallets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## Step 2: Alternative - More Secure Approach
If you prefer a more secure approach, run this instead:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Runners can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Runners can update their own wallet" ON wallets;

-- Create policies that allow wallet management
CREATE POLICY "Runners can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (runner_id = auth.uid());

CREATE POLICY "Runners can insert their own wallet"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (runner_id = auth.uid());

CREATE POLICY "Runners can update their own wallet"
  ON wallets
  FOR UPDATE
  TO authenticated
  USING (runner_id = auth.uid());

-- Allow system to create wallets for runners (needed for triggers)
CREATE POLICY "Allow wallet creation for runners"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = runner_id 
      AND profiles.user_type = 'runner'
    )
  );
```

## Step 3: Test the Fix
1. Go back to your app: http://localhost:5173
2. Try the rating flow again
3. The error should be resolved

## What This Fixes
- ✅ **System can create wallet entries** for runners
- ✅ **Runners can view their own wallets**
- ✅ **Runners can update their own wallets**
- ✅ **Rating system works properly**
- ✅ **Wallet balance updates work**

## Test the Fix
After running the SQL:
1. **Complete an errand** (mark as completed)
2. **Try to rate** the other user
3. **Should work without errors** now
4. **Check that wallet balances update** properly

## Success Indicators
- ✅ No more "row-level security policy" errors for wallets
- ✅ Rating submission works
- ✅ Wallet records are created/updated properly
- ✅ Rating appears in the system
- ✅ Wallet balances show correct amounts
