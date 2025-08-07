# 🚀 Quick Migration Setup

## Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/seytsbvtygkalvalugkk/sql
2. Click **"New Query"**

## Step 2: Run Migration 1 (Core Schema)
Copy and paste this entire block into the SQL Editor:

```sql
-- Create custom types
CREATE TYPE user_type AS ENUM ('poster', 'runner');
CREATE TYPE errand_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL,
  full_name text NOT NULL,
  phone text,
  location text NOT NULL,
  latitude decimal,
  longitude decimal,
  avatar_url text,
  rating decimal DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  completed_tasks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Errands table
CREATE TABLE IF NOT EXISTS errands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  latitude decimal,
  longitude decimal,
  amount decimal NOT NULL CHECK (amount > 0),
  deadline timestamptz,
  status errand_status DEFAULT 'open',
  assigned_runner_id uuid REFERENCES profiles(id),
  image_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id uuid NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  runner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal NOT NULL CHECK (amount > 0),
  message text,
  status bid_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(errand_id, runner_id)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id uuid NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  poster_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  runner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(errand_id, poster_id, runner_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE errands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Errands policies
CREATE POLICY "Anyone can view open errands" ON errands FOR SELECT TO authenticated USING (status = 'open' OR poster_id = auth.uid() OR assigned_runner_id = auth.uid());
CREATE POLICY "Posters can insert errands" ON errands FOR INSERT TO authenticated WITH CHECK (poster_id = auth.uid());
CREATE POLICY "Posters can update own errands" ON errands FOR UPDATE TO authenticated USING (poster_id = auth.uid());
CREATE POLICY "Assigned runners can update errand status" ON errands FOR UPDATE TO authenticated USING (assigned_runner_id = auth.uid() AND status IN ('in_progress', 'completed'));

-- Bids policies
CREATE POLICY "Users can view bids for their errands" ON bids FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM errands WHERE errands.id = errand_id AND (errands.poster_id = auth.uid() OR runner_id = auth.uid()))
);
CREATE POLICY "Runners can insert bids" ON bids FOR INSERT TO authenticated WITH CHECK (runner_id = auth.uid());
CREATE POLICY "Posters can update bid status" ON bids FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM errands WHERE errands.id = errand_id AND errands.poster_id = auth.uid())
);

-- Ratings policies
CREATE POLICY "Users can view ratings" ON ratings FOR SELECT TO authenticated USING (poster_id = auth.uid() OR runner_id = auth.uid());
CREATE POLICY "Posters can insert ratings" ON ratings FOR INSERT TO authenticated WITH CHECK (poster_id = auth.uid());

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_errands_updated_at BEFORE UPDATE ON errands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update runner rating
CREATE OR REPLACE FUNCTION update_runner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET 
    rating = (SELECT AVG(rating) FROM ratings WHERE runner_id = NEW.runner_id),
    completed_tasks = (SELECT COUNT(*) FROM ratings WHERE runner_id = NEW.runner_id)
  WHERE id = NEW.runner_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_runner_rating_trigger AFTER INSERT ON ratings FOR EACH ROW EXECUTE FUNCTION update_runner_rating();
```

Click **"Run"** and wait for it to complete.

## Step 3: Run Migration 2 (Verification System)
Create a **new query** and run:

```sql
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

-- Create policy for verification data access
CREATE POLICY "Users can view own verification status"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

## Step 4: Run Migration 3 (Enhanced Features)
Create a **new query** and run:

```sql
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

-- Create transactions table
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

-- Create wallets table
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

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON transactions;
CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_user_rating_trigger ON mutual_ratings;
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transactions_poster_id ON transactions(poster_id);
CREATE INDEX IF NOT EXISTS idx_transactions_runner_id ON transactions(runner_id);
CREATE INDEX IF NOT EXISTS idx_mutual_ratings_rated_id ON mutual_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_wallets_runner_id ON wallets(runner_id);
```

## Step 5: Test the App
1. Go back to `http://localhost:5173`
2. Try signing up with a test account
3. Check the browser console for success messages
4. Test posting errands and placing bids

## ✅ Success Indicators
- Console shows "✅ Supabase connection successful!"
- Sign-up process completes without errors
- You can log in and see the dashboard
- No more "PGRST116" errors

## 🆘 If You Still Get Errors
1. Check that all 3 migrations ran successfully
2. Verify tables exist in Supabase dashboard
3. Clear browser cache and try again
4. Check browser console for specific error messages
