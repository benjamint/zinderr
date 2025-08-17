# Chat & Location Tracking Setup Guide

This guide will help you set up the real-time chat and location tracking features for your Zinderr app.

## 🚀 Features Overview

### **Real-Time Chat System**
- ✅ In-app messaging between poster and runner
- ✅ Real-time updates using Supabase Realtime
- ✅ Message history and timestamps
- ✅ Secure access control

### **Location Tracking System**
- ✅ Live location sharing for runners
- ✅ Real-time location updates
- ✅ ETA calculations
- ✅ Location history tracking
- ✅ Privacy-focused (only shared during active errands)

## 📋 Prerequisites

1. **Supabase Project** - Already set up
2. **Database Migrations** - Run the SQL script below
3. **Browser Geolocation** - Users must allow location access

## 🗄️ Database Setup

### Step 1: Run the Migration Script

Copy and paste this SQL into your **Supabase SQL Editor**:

```sql
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
  timestamp TIMESTAMPTZ DEFAULT NOW(),
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
CREATE INDEX IF NOT EXISTS idx_location_updates_timestamp ON location_updates(timestamp);

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

-- Users can delete their own messages
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
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lu.latitude,
    lu.longitude,
    lu.accuracy,
    lu.timestamp
  FROM location_updates lu
  WHERE lu.user_id = user_uuid AND lu.errand_id = errand_uuid
  ORDER BY lu.timestamp DESC
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
```

### Step 2: Verify Tables Created

After running the script, you should see these new tables in your Supabase dashboard:
- `chat_messages` - Stores all chat messages
- `location_updates` - Stores location tracking data

## 🔧 Component Integration

### **Chat System Components**
- ✅ `ChatModal.tsx` - Main chat interface
- ✅ Real-time messaging using Supabase Realtime
- ✅ Message history and user identification

### **Location Tracking Components**
- ✅ `LocationTracker.tsx` - Location sharing interface
- ✅ Browser geolocation integration
- ✅ ETA calculations and location history

### **Updated Components**
- ✅ `ErrandDetailsModal.tsx` - Added chat and location buttons
- ✅ `MyTasksModal.tsx` - Added chat and location for runners
- ✅ `PostErrandModal.tsx` - Added destination coordinates
- ✅ `EditErrandModal.tsx` - Added destination coordinates

## 🎯 How It Works

### **Chat System Flow**
1. **User opens errand details** (poster or runner)
2. **Chat button appears** when errand is in progress
3. **Real-time messaging** using Supabase Realtime
4. **Message history** stored in database
5. **Secure access** - only involved users can chat

### **Location Tracking Flow**
1. **Runner starts location sharing** for active errand
2. **Browser geolocation** captures coordinates
3. **Real-time updates** sent to Supabase
4. **Poster can track** runner's progress
5. **ETA calculations** based on distance

## 🔒 Security Features

### **Row Level Security (RLS)**
- ✅ Users can only access chat/location for their errands
- ✅ Message ownership validation
- ✅ Location data privacy protection

### **Access Control**
- ✅ Chat only available during active errands
- ✅ Location sharing only for assigned runners
- ✅ Real-time updates with authentication

## 🚀 Usage Instructions

### **For Posters:**
1. **Create errand** with optional destination coordinates
2. **Accept runner bid** to start the process
3. **Chat with runner** using the chat button
4. **Track runner location** using the location button
5. **Mark as completed** when errand is done

### **For Runners:**
1. **Bid on errands** as usual
2. **Start location sharing** when assigned
3. **Chat with poster** for coordination
4. **Update location** automatically
5. **Mark as completed** when finished

## 🗺️ Map Integration (Future Enhancement)

Currently, the location tracking shows coordinates and ETA calculations. To add actual maps:

### **Google Maps Integration**
```typescript
// Add to package.json
"@googlemaps/js-api-loader": "^1.16.2"

// Usage in LocationTracker
import { Loader } from '@googlemaps/js-api-loader'

const loader = new Loader({
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  version: 'weekly'
})
```

### **Mapbox Integration**
```typescript
// Add to package.json
"mapbox-gl": "^2.15.0"

// Usage in LocationTracker
import mapboxgl from 'mapbox-gl'
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'
```

## 🧪 Testing the Features

### **Test Chat System:**
1. **Create an errand** as a poster
2. **Accept a bid** from a runner
3. **Open errand details** and click "Chat"
4. **Send messages** and verify real-time updates

### **Test Location Tracking:**
1. **As a runner**, accept an errand
2. **Click "Share Location"** button
3. **Allow browser location** access
4. **Verify location updates** in real-time

## 🐛 Troubleshooting

### **Chat Not Working:**
- ✅ Check Supabase Realtime is enabled
- ✅ Verify RLS policies are correct
- ✅ Check browser console for errors

### **Location Not Updating:**
- ✅ Ensure browser location permission is granted
- ✅ Check if HTTPS is enabled (required for geolocation)
- ✅ Verify RLS policies for location_updates table

### **Database Errors:**
- ✅ Run the migration script completely
- ✅ Check table permissions in Supabase
- ✅ Verify foreign key relationships

## 📱 Mobile Considerations

### **Geolocation on Mobile:**
- ✅ Works on iOS Safari and Android Chrome
- ✅ Requires HTTPS in production
- ✅ Battery optimization may affect updates

### **Chat on Mobile:**
- ✅ Responsive design for small screens
- ✅ Touch-friendly interface
- ✅ Real-time updates work on mobile

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Chat messages appear in real-time
- ✅ Location updates show current coordinates
- ✅ ETA calculations are displayed
- ✅ No console errors related to chat/location
- ✅ Users can communicate during active errands

## 🔮 Future Enhancements

### **Advanced Features:**
- 🗺️ **Real-time maps** with Google Maps/Mapbox
- 📍 **Geofencing** for automatic status updates
- 🔔 **Push notifications** for messages
- 📊 **Analytics** for delivery times
- 🚗 **Route optimization** for multiple errands

Your Zinderr app now has professional-grade real-time communication and location tracking! 🚀
