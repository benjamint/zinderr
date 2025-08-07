# 🔍 Database Status Check

## Step 1: Check What Already Exists

Since you got "type user_type already exists", let's check what's already set up. Run this query in your Supabase SQL Editor:

```sql
-- Check existing types
SELECT typname FROM pg_type WHERE typname IN ('user_type', 'errand_status', 'bid_status', 'verification_status');

-- Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'errands', 'bids', 'ratings', 'transactions', 'mutual_ratings', 'wallets');

-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

## Step 2: Run Safe Migration

Since some types already exist, let's run a safe version that skips existing items:

```sql
-- Safe migration that skips existing items
DO $$
BEGIN
    -- Create types only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE user_type AS ENUM ('poster', 'runner');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'errand_status') THEN
        CREATE TYPE errand_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bid_status') THEN
        CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
    END IF;
END $$;

-- Create tables only if they don't exist
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

-- Enable RLS (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE errands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view open errands" ON errands;
DROP POLICY IF EXISTS "Posters can insert errands" ON errands;
DROP POLICY IF EXISTS "Posters can update own errands" ON errands;
DROP POLICY IF EXISTS "Assigned runners can update errand status" ON errands;

DROP POLICY IF EXISTS "Users can view bids for their errands" ON bids;
DROP POLICY IF EXISTS "Runners can insert bids" ON bids;
DROP POLICY IF EXISTS "Posters can update bid status" ON bids;

DROP POLICY IF EXISTS "Users can view ratings" ON ratings;
DROP POLICY IF EXISTS "Posters can insert ratings" ON ratings;

-- Create policies
CREATE POLICY "Users can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view open errands" ON errands FOR SELECT TO authenticated USING (status = 'open' OR poster_id = auth.uid() OR assigned_runner_id = auth.uid());
CREATE POLICY "Posters can insert errands" ON errands FOR INSERT TO authenticated WITH CHECK (poster_id = auth.uid());
CREATE POLICY "Posters can update own errands" ON errands FOR UPDATE TO authenticated USING (poster_id = auth.uid());
CREATE POLICY "Assigned runners can update errand status" ON errands FOR UPDATE TO authenticated USING (assigned_runner_id = auth.uid() AND status IN ('in_progress', 'completed'));

CREATE POLICY "Users can view bids for their errands" ON bids FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM errands WHERE errands.id = errand_id AND (errands.poster_id = auth.uid() OR runner_id = auth.uid()))
);
CREATE POLICY "Runners can insert bids" ON bids FOR INSERT TO authenticated WITH CHECK (runner_id = auth.uid());
CREATE POLICY "Posters can update bid status" ON bids FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM errands WHERE errands.id = errand_id AND errands.poster_id = auth.uid())
);

CREATE POLICY "Users can view ratings" ON ratings FOR SELECT TO authenticated USING (poster_id = auth.uid() OR runner_id = auth.uid());
CREATE POLICY "Posters can insert ratings" ON ratings FOR INSERT TO authenticated WITH CHECK (poster_id = auth.uid());

-- Functions and triggers (safe to run multiple times)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_errands_updated_at ON errands;
CREATE TRIGGER update_errands_updated_at BEFORE UPDATE ON errands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS update_runner_rating_trigger ON ratings;
CREATE TRIGGER update_runner_rating_trigger AFTER INSERT ON ratings FOR EACH ROW EXECUTE FUNCTION update_runner_rating();
```

## Step 3: Add Missing Columns

Run this to add any missing columns to the profiles table:

```sql
-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add verification columns if they don't exist
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

  -- Add username and wallet columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
    ALTER TABLE profiles ADD COLUMN display_username boolean DEFAULT false;
    ALTER TABLE profiles ADD COLUMN wallet_balance numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing poster profiles to be automatically verified
UPDATE profiles 
SET verification_status = 'verified', verified_at = now() 
WHERE user_type = 'poster' AND verification_status = 'pending';
```

## Step 4: Create Additional Tables

Run this to create the remaining tables:

```sql
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

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
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

DROP POLICY IF EXISTS "Users can insert their own ratings" ON mutual_ratings;
CREATE POLICY "Users can insert their own ratings"
  ON mutual_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (rater_id = auth.uid());

DROP POLICY IF EXISTS "Users can view ratings about them" ON mutual_ratings;
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

DROP POLICY IF EXISTS "Runners can view their own wallet" ON wallets;
CREATE POLICY "Runners can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (runner_id = auth.uid());

DROP POLICY IF EXISTS "Runners can update their own wallet" ON wallets;
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

-- Functions and triggers for wallet and ratings
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

After running these queries:
1. Go back to `http://localhost:5173`
2. Check the browser console for "✅ Supabase connection successful!"
3. Try signing up with a test account
4. Test the app functionality

## ✅ Success Indicators
- Console shows "✅ Supabase connection successful!"
- No more "PGRST116" errors
- Sign-up and login work perfectly
- All app features are functional
