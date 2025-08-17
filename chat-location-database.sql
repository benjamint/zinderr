-- Chat and Location Tracking Database Setup
-- Run this in your Supabase SQL Editor

-- Step 1: Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  errand_id UUID NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create location_updates table
CREATE TABLE IF NOT EXISTS location_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  errand_id UUID NOT NULL REFERENCES errands(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  location_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add destination coordinates to errands table
ALTER TABLE errands 
ADD COLUMN IF NOT EXISTS destination_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS destination_lng DECIMAL(11, 8);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_errand_id ON chat_messages(errand_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_location_updates_errand_id ON location_updates(errand_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_user_id ON location_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_timestamp ON location_updates(location_timestamp);

-- Step 5: Create RLS policies for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for errands they're involved in
CREATE POLICY "Users can view chat messages for their errands"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM errands
    WHERE errands.id = errand_id
    AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
  )
);

-- Users can send messages for errands they're involved in
CREATE POLICY "Users can send chat messages for their errands"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM errands
    WHERE errands.id = errand_id
    AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
  )
);

-- Users can update their own messages
CREATE POLICY "Users can update their own chat messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Users can delete their own chat messages
CREATE POLICY "Users can delete their own chat messages"
ON chat_messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Step 6: Create RLS policies for location_updates
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;

-- Users can view location updates for errands they're involved in
CREATE POLICY "Users can view location updates for their errands"
ON location_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM errands
    WHERE errands.id = errand_id
    AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
  )
);

-- Users can update their own location for errands they're involved in
CREATE POLICY "Users can update their location for their errands"
ON location_updates FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM errands
    WHERE errands.id = errand_id
    AND (errands.poster_id = auth.uid() OR errands.assigned_runner_id = auth.uid())
  )
);

-- Users can update their own location records
CREATE POLICY "Users can update their own location records"
ON location_updates FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own location records
CREATE POLICY "Users can delete their own location records"
ON location_updates FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 7: Create functions for chat and location features

-- Function to get chat participants for an errand
CREATE OR REPLACE FUNCTION get_errand_participants(errand_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  user_type TEXT,
  is_poster BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.user_type,
    CASE WHEN e.poster_id = p.id THEN true ELSE false END as is_poster
  FROM profiles p
  JOIN errands e ON (e.poster_id = p.id OR e.assigned_runner_id = p.id)
  WHERE e.id = errand_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest location for a user on an errand
CREATE OR REPLACE FUNCTION get_latest_location(user_uuid UUID, errand_uuid UUID)
RETURNS TABLE (
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(8, 2),
  location_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lu.latitude,
    lu.longitude,
    lu.accuracy,
    lu.location_timestamp
  FROM location_updates lu
  WHERE lu.user_id = user_uuid AND lu.errand_id = errand_uuid
  ORDER BY lu.location_timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Chat and location tracking database setup completed successfully!' as status;
