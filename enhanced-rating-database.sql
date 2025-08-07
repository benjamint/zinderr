-- Enhanced Rating System Database Updates
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to mutual_ratings table
ALTER TABLE mutual_ratings 
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hidden_until timestamptz,
ADD COLUMN IF NOT EXISTS report_reason text,
ADD COLUMN IF NOT EXISTS report_submitted_at timestamptz;

-- Create index for hidden ratings
CREATE INDEX IF NOT EXISTS idx_mutual_ratings_hidden ON mutual_ratings(is_hidden, hidden_until);

-- Step 2: Add rating statistics columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating decimal DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rating_update timestamptz;

-- Step 3: Update the trigger to handle hidden ratings
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update ratings for non-hidden ratings or expired hidden ratings
  UPDATE profiles
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mutual_ratings
    WHERE rated_id = NEW.rated_id
    AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
  ),
  updated_at = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Function to reveal ratings after both parties rate or 24 hours
CREATE OR REPLACE FUNCTION check_and_reveal_ratings()
RETURNS TRIGGER AS $$
DECLARE
  both_rated boolean;
  errand_id_val uuid;
BEGIN
  -- Get the errand_id for this rating
  errand_id_val := NEW.errand_id;
  
  -- Check if both parties have rated
  SELECT COUNT(*) = 2 INTO both_rated
  FROM mutual_ratings
  WHERE errand_id = errand_id_val
  AND rating_type IN ('poster_to_runner', 'runner_to_poster');
  
  -- If both rated, reveal all ratings for this errand
  IF both_rated THEN
    UPDATE mutual_ratings
    SET is_hidden = false, hidden_until = NULL
    WHERE errand_id = errand_id_val;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check and reveal ratings
DROP TRIGGER IF EXISTS check_reveal_ratings_trigger ON mutual_ratings;
CREATE TRIGGER check_reveal_ratings_trigger
  AFTER INSERT ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_and_reveal_ratings();

-- Step 5: Function to automatically reveal ratings after 24 hours
CREATE OR REPLACE FUNCTION auto_reveal_expired_ratings()
RETURNS void AS $$
BEGIN
  UPDATE mutual_ratings
  SET is_hidden = false, hidden_until = NULL
  WHERE is_hidden = true 
  AND hidden_until < now();
END;
$$ LANGUAGE plpgsql;

-- Step 6: Function to update rating statistics
CREATE OR REPLACE FUNCTION update_rating_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    total_ratings = (
      SELECT COUNT(*)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
    ),
    last_rating_update = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating statistics
DROP TRIGGER IF EXISTS update_rating_statistics_trigger ON mutual_ratings;
CREATE TRIGGER update_rating_statistics_trigger
  AFTER INSERT OR UPDATE ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_statistics();

-- Step 7: Update existing ratings to be visible (for backward compatibility)
UPDATE mutual_ratings 
SET is_hidden = false, hidden_until = NULL 
WHERE is_hidden IS NULL OR is_hidden = true;

-- Step 8: Update existing profiles with rating statistics
UPDATE profiles 
SET 
  total_ratings = (
    SELECT COUNT(*)
    FROM mutual_ratings
    WHERE rated_id = profiles.id
    AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
  ),
  average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mutual_ratings
    WHERE rated_id = profiles.id
    AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
  ),
  last_rating_update = now()
WHERE total_ratings IS NULL OR average_rating IS NULL;

-- Step 9: Add RLS policies for the new columns (if needed)
-- The existing policies should work, but let's make sure

-- Verify all tables have proper RLS policies
DO $$
BEGIN
  -- Check if mutual_ratings has RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'mutual_ratings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE mutual_ratings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Success message
SELECT 'Enhanced rating system database updates completed successfully!' as status;
