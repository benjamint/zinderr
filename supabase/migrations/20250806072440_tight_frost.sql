/*
  # Neighborhood Errands App Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `user_type` (enum: 'poster' or 'runner')
      - `full_name` (text)
      - `phone` (text, optional)
      - `location` (text)
      - `latitude` (decimal, optional)
      - `longitude` (decimal, optional)
      - `avatar_url` (text, optional)
      - `rating` (decimal, default 0)
      - `completed_tasks` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `errands`
      - `id` (uuid, primary key)
      - `poster_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `latitude` (decimal, optional)
      - `longitude` (decimal, optional)
      - `amount` (decimal)
      - `deadline` (timestamptz, optional)
      - `status` (enum: 'open', 'in_progress', 'completed', 'cancelled')
      - `assigned_runner_id` (uuid, references profiles, optional)
      - `image_url` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bids`
      - `id` (uuid, primary key)
      - `errand_id` (uuid, references errands)
      - `runner_id` (uuid, references profiles)
      - `amount` (decimal)
      - `message` (text, optional)
      - `status` (enum: 'pending', 'accepted', 'rejected')
      - `created_at` (timestamptz)

    - `ratings`
      - `id` (uuid, primary key)
      - `errand_id` (uuid, references errands)
      - `poster_id` (uuid, references profiles)
      - `runner_id` (uuid, references profiles)
      - `rating` (integer, 1-5)
      - `comment` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for errand visibility and bidding
*/

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

-- Functions and triggers for updated_at
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