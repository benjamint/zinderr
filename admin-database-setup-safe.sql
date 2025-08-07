-- Admin Panel Database Setup (Safe Version)
-- Run this in your Supabase SQL Editor

-- Step 1: Check if 'admin' value exists in user_type enum
DO $$
BEGIN
    -- Check if 'admin' value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_type')
    ) THEN
        -- Add 'admin' to user_type enum only if it doesn't exist
        ALTER TYPE user_type ADD VALUE 'admin';
    END IF;
END $$;

-- Step 2: Add suspension columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Step 3: Add flagging and disabling columns to errands table
ALTER TABLE errands 
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
ADD COLUMN IF NOT EXISTS flagged_reason text,
ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
ADD COLUMN IF NOT EXISTS disabled_reason text;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_errands_flagged ON errands(is_flagged);
CREATE INDEX IF NOT EXISTS idx_errands_disabled ON errands(is_disabled);

-- Step 5: Drop existing admin policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all errands" ON errands;
DROP POLICY IF EXISTS "Admin can update all errands" ON errands;
DROP POLICY IF EXISTS "Admin can view all bids" ON bids;
DROP POLICY IF EXISTS "Admin can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admin can view all mutual_ratings" ON mutual_ratings;

-- Step 6: Create admin RLS policies
CREATE POLICY "Admin can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can view all errands"
ON errands FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can update all errands"
ON errands FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can view all bids"
ON bids FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can view all transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

CREATE POLICY "Admin can view all mutual_ratings"
ON mutual_ratings FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE user_type = 'admin'
  )
);

-- Step 7: Create helper functions (drop if they exist first)
DROP FUNCTION IF EXISTS get_user_stats(uuid);
CREATE OR REPLACE FUNCTION get_user_stats(user_id uuid)
RETURNS TABLE (
  errands_count bigint,
  bids_count bigint,
  total_earned decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM errands WHERE poster_id = user_id) as errands_count,
    (SELECT COUNT(*) FROM bids WHERE runner_id = user_id) as bids_count,
    (SELECT COALESCE(SUM(amount), 0) FROM errands WHERE assigned_runner_id = user_id AND status = 'completed') as total_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_errand_stats(uuid);
CREATE OR REPLACE FUNCTION get_errand_stats(errand_id uuid)
RETURNS TABLE (
  bids_count bigint,
  total_bid_amount decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM bids WHERE errand_id = errand_id) as bids_count,
    (SELECT COALESCE(SUM(amount), 0) FROM bids WHERE errand_id = errand_id) as total_bid_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Admin panel database setup completed successfully!' as status;
