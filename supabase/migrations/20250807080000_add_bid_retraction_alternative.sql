-- Alternative Approach: Add Bid Retraction Functionality
-- This migration uses a safer approach to handle the enum change

-- Step 1: Add the new columns first (this is safe)
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS retracted_at timestamptz DEFAULT NULL;

ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS retraction_reason text DEFAULT NULL;

-- Step 2: Create the new enum type
CREATE TYPE bid_status_new AS ENUM ('pending', 'accepted', 'rejected', 'retracted');

-- Step 3: Update existing data to ensure compatibility
-- First, let's check what status values currently exist
-- This will help us identify any potential issues

-- Step 4: Temporarily remove the default constraint
ALTER TABLE bids ALTER COLUMN status DROP DEFAULT;

-- Step 5: Change the column type
ALTER TABLE bids 
  ALTER COLUMN status TYPE bid_status_new 
  USING status::text::bid_status_new;

-- Step 6: Add the default back
ALTER TABLE bids ALTER COLUMN status SET DEFAULT 'pending';

-- Step 7: Drop the old enum and rename the new one
DROP TYPE bid_status;
ALTER TYPE bid_status_new RENAME TO bid_status;

-- Step 8: Create the retract_bid function
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

-- Step 9: Grant execute permission
GRANT EXECUTE ON FUNCTION retract_bid(uuid, text) TO authenticated;

-- Step 10: Update RLS policies
DROP POLICY IF EXISTS "Runners can retract own bids" ON bids;

CREATE POLICY "Runners can retract own bids" ON bids 
FOR UPDATE TO authenticated 
USING (runner_id = auth.uid()) 
WITH CHECK (runner_id = auth.uid());

-- Step 11: Verification queries
-- Check the new enum values
SELECT 
  enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status')
ORDER BY enumsortorder;

-- Check the new columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN ('retracted_at', 'retraction_reason');

-- Check the status column
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name = 'status';
