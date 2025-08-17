-- Fix Rating Counter System
-- This script ensures that total_ratings and average_rating are properly updated

-- First, let's check if the new rating fields exist in the profiles table
DO $$
BEGIN
  -- Add total_ratings column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_ratings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_ratings integer DEFAULT 0;
    RAISE NOTICE 'Added total_ratings column to profiles table';
  ELSE
    RAISE NOTICE 'total_ratings column already exists';
  END IF;

  -- Add average_rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN average_rating numeric(3,2) DEFAULT 0;
    RAISE NOTICE 'Added average_rating column to profiles table';
  ELSE
    RAISE NOTICE 'average_rating column already exists';
  END IF;

  -- Add last_rating_update column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_rating_update'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_rating_update timestamptz DEFAULT now();
    RAISE NOTICE 'Added last_rating_update column to profiles table';
  ELSE
    RAISE NOTICE 'last_rating_update column already exists';
  END IF;
END $$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_user_rating_trigger ON mutual_ratings;

-- Create a new function to properly update rating statistics
CREATE OR REPLACE FUNCTION update_user_rating_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rated user's rating statistics
  UPDATE profiles
  SET 
    total_ratings = (
      SELECT COUNT(*)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND is_hidden = false  -- Only count visible ratings
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND is_hidden = false  -- Only count visible ratings
    ),
    last_rating_update = now(),
    updated_at = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger
CREATE TRIGGER update_user_rating_statistics_trigger
  AFTER INSERT OR UPDATE ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_statistics();

-- Also create a trigger for when ratings are revealed (is_hidden changes from true to false)
CREATE OR REPLACE FUNCTION reveal_hidden_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- If rating is being revealed, update statistics
  IF OLD.is_hidden = true AND NEW.is_hidden = false THEN
    -- Update the rated user's rating statistics
    UPDATE profiles
    SET 
      total_ratings = (
        SELECT COUNT(*)
        FROM mutual_ratings
        WHERE rated_id = NEW.rated_id
        AND is_hidden = false
      ),
      average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM mutual_ratings
        WHERE rated_id = NEW.rated_id
        AND is_hidden = false
      ),
      last_rating_update = now(),
      updated_at = now()
    WHERE id = NEW.rated_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for revealing hidden ratings
CREATE TRIGGER reveal_hidden_ratings_trigger
  AFTER UPDATE ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION reveal_hidden_ratings();

-- Initialize existing rating statistics for all users
UPDATE profiles 
SET 
  total_ratings = (
    SELECT COUNT(*)
    FROM mutual_ratings
    WHERE rated_id = profiles.id
    AND is_hidden = false
  ),
  average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mutual_ratings
    WHERE rated_id = profiles.id
    AND is_hidden = false
  ),
  last_rating_update = now()
WHERE EXISTS (
  SELECT 1 FROM mutual_ratings WHERE rated_id = profiles.id
);

-- Verify the triggers are created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'mutual_ratings'
ORDER BY trigger_name;

-- Test the rating system
-- You can run this to see current rating statistics:
-- SELECT id, full_name, total_ratings, average_rating, last_rating_update FROM profiles WHERE total_ratings > 0;

-- Function to automatically reveal hidden ratings after 24 hours
CREATE OR REPLACE FUNCTION auto_reveal_hidden_ratings()
RETURNS void AS $$
BEGIN
  -- Update ratings that are past their hidden_until time
  UPDATE mutual_ratings
  SET 
    is_hidden = false,
    hidden_until = null
  WHERE 
    is_hidden = true 
    AND hidden_until IS NOT NULL 
    AND hidden_until <= now();
  
  -- The trigger will automatically update the user statistics when is_hidden changes
END;
$$ LANGUAGE plpgsql;

-- You can run this function manually or set up a cron job:
-- SELECT auto_reveal_hidden_ratings();

-- To set up automatic execution every hour, you can use pg_cron extension:
-- SELECT cron.schedule('reveal-hidden-ratings', '0 * * * *', 'SELECT auto_reveal_hidden_ratings();');

-- For now, you can manually run this function to reveal old ratings:
-- SELECT auto_reveal_hidden_ratings();
