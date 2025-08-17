-- Add Bid Retraction Functionality
-- This migration adds the ability for runners to retract their bids

-- First, let's add the 'retracted' status to the bid_status enum
-- We need to create a new enum type and update existing data

-- Create new enum with retracted status
CREATE TYPE bid_status_new AS ENUM ('pending', 'accepted', 'rejected', 'retracted');

-- Remove the default constraint from the status column temporarily
ALTER TABLE bids ALTER COLUMN status DROP DEFAULT;

-- Update the bids table to use the new enum
ALTER TABLE bids 
  ALTER COLUMN status TYPE bid_status_new 
  USING status::text::bid_status_new;

-- Add the default back with the new enum type
ALTER TABLE bids ALTER COLUMN status SET DEFAULT 'pending';

-- Drop the old enum
DROP TYPE bid_status;

-- Rename the new enum to the original name
ALTER TYPE bid_status_new RENAME TO bid_status;

-- Add a retracted_at timestamp column to track when bids were retracted
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS retracted_at timestamptz DEFAULT NULL;

-- Add a retraction_reason column for optional explanation
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS retraction_reason text DEFAULT NULL;

-- Update RLS policies to allow runners to retract their own bids
DROP POLICY IF EXISTS "Runners can retract own bids" ON bids;

CREATE POLICY "Runners can retract own bids" ON bids 
FOR UPDATE TO authenticated 
USING (runner_id = auth.uid()) 
WITH CHECK (runner_id = auth.uid());

-- Create a function to handle bid retraction
CREATE OR REPLACE FUNCTION retract_bid(
  bid_id uuid,
  retraction_reason text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  bid_record bids%ROWTYPE;
  errand_record errands%ROWTYPE;
BEGIN
  -- Get the bid details
  SELECT * INTO bid_record FROM bids WHERE id = bid_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;
  
  -- Check if the bid can be retracted
  IF bid_record.status = 'accepted' THEN
    -- Get errand details to check if it's already in progress
    SELECT * INTO errand_record FROM errands WHERE id = bid_record.errand_id;
    
    IF errand_record.status = 'in_progress' OR errand_record.status = 'completed' THEN
      RAISE EXCEPTION 'Cannot retract accepted bid for errand that is in progress or completed';
    END IF;
  END IF;
  
  -- Update the bid status
  UPDATE bids 
  SET 
    status = 'retracted',
    retracted_at = now(),
    retraction_reason = retraction_reason
  WHERE id = bid_id;
  
  -- If this was an accepted bid, reset the errand to open status
  IF bid_record.status = 'accepted' THEN
    UPDATE errands 
    SET 
      status = 'open',
      assigned_runner_id = NULL,
      updated_at = now()
    WHERE id = bid_record.errand_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION retract_bid(uuid, text) TO authenticated;

-- Verify the changes
SELECT 
  enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status')
ORDER BY enumsortorder;

-- Check the updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
ORDER BY ordinal_position;
