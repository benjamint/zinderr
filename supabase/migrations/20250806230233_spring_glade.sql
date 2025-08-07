/*
  # Update profiles table for runner verification

  1. New Columns
    - `verification_status` (enum: pending, verified, rejected)
    - `ghana_card_front_url` (text, nullable)
    - `ghana_card_back_url` (text, nullable)
    - `selfie_url` (text, nullable)
    - `verification_notes` (text, nullable)
    - `verified_at` (timestamp, nullable)

  2. Security
    - Update existing RLS policies to handle verification status
    - Add policy for verification data access
*/

-- Create verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Add verification columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_status verification_status DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ghana_card_front_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ghana_card_front_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ghana_card_back_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ghana_card_back_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'selfie_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN selfie_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- Update existing poster profiles to be automatically verified
UPDATE profiles 
SET verification_status = 'verified', verified_at = now() 
WHERE user_type = 'poster' AND verification_status = 'pending';

-- Create policy for verification data access (admin only in production)
CREATE POLICY "Users can view own verification status"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Update the existing policies to ensure runners can only bid if verified
-- This will be enforced at the application level for now