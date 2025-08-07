/*
  # Enhanced Features for Zinderr

  1. New Tables
    - `user_profiles` - Extended user profiles with username and display preferences
    - `transactions` - Track completed errands and payments
    - `mutual_ratings` - Ratings between posters and runners
    - `wallets` - Runner earnings tracking

  2. Updates
    - Add username and display preferences to profiles
    - Add wallet balance tracking
    - Add mutual rating system

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for data access
*/

-- Add username and display preferences to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
    ALTER TABLE profiles ADD COLUMN display_username boolean DEFAULT false;
    ALTER TABLE profiles ADD COLUMN wallet_balance numeric DEFAULT 0;
  END IF;
END $$;

-- Create transactions table for tracking completed errands
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id uuid NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  poster_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  runner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'disputed')),
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (poster_id = auth.uid() OR runner_id = auth.uid());

-- Create mutual ratings table
CREATE TABLE IF NOT EXISTS mutual_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  errand_id uuid NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  rating_type text NOT NULL CHECK (rating_type IN ('poster_to_runner', 'runner_to_poster')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id, rater_id, rated_id)
);

ALTER TABLE mutual_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own ratings"
  ON mutual_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (rater_id = auth.uid());

CREATE POLICY "Users can view ratings about them"
  ON mutual_ratings
  FOR SELECT
  TO authenticated
  USING (rater_id = auth.uid() OR rated_id = auth.uid());

-- Create wallets table for runner earnings
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_earned numeric DEFAULT 0 CHECK (total_earned >= 0),
  available_balance numeric DEFAULT 0 CHECK (available_balance >= 0),
  total_withdrawn numeric DEFAULT 0 CHECK (total_withdrawn >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Runners can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (runner_id = auth.uid());

CREATE POLICY "Runners can update their own wallet"
  ON wallets
  FOR UPDATE
  TO authenticated
  USING (runner_id = auth.uid());

-- Create wallet entries for existing runners
INSERT INTO wallets (runner_id)
SELECT id FROM profiles 
WHERE user_type = 'runner' 
AND id NOT IN (SELECT runner_id FROM wallets);

-- Function to update wallet balance after transaction
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update wallet balance when transaction is completed
  IF NEW.status = 'completed' THEN
    INSERT INTO wallets (runner_id, total_earned, available_balance)
    VALUES (NEW.runner_id, NEW.amount, NEW.amount)
    ON CONFLICT (runner_id)
    DO UPDATE SET
      total_earned = wallets.total_earned + NEW.amount,
      available_balance = wallets.available_balance + NEW.amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet balance
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON transactions;
CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Function to update user ratings
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rated user's average rating
  UPDATE profiles
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mutual_ratings
    WHERE rated_id = NEW.rated_id
  ),
  updated_at = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user ratings
DROP TRIGGER IF EXISTS update_user_rating_trigger ON mutual_ratings;
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_poster_id ON transactions(poster_id);
CREATE INDEX IF NOT EXISTS idx_transactions_runner_id ON transactions(runner_id);
CREATE INDEX IF NOT EXISTS idx_mutual_ratings_rated_id ON mutual_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_wallets_runner_id ON wallets(runner_id);