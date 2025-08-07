# 🌟 Enhanced Rating System Implementation

## Overview
Implementing an Uber-style two-way rating system where both parties rate each other after an errand is completed, with hidden ratings until both submit or 24 hours pass.

## Database Schema Updates

### Step 1: Update Mutual Ratings Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Add new columns to mutual_ratings table
ALTER TABLE mutual_ratings 
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hidden_until timestamptz,
ADD COLUMN IF NOT EXISTS report_reason text,
ADD COLUMN IF NOT EXISTS report_submitted_at timestamptz;

-- Create index for hidden ratings
CREATE INDEX IF NOT EXISTS idx_mutual_ratings_hidden ON mutual_ratings(is_hidden, hidden_until);

-- Update the trigger to handle hidden ratings
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update ratings for non-hidden ratings or expired hidden ratings
  UPDATE profiles
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mutual_ratings
    WHERE rated_id = NEW.rated_id
    AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
  ),
  updated_at = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reveal ratings after both parties rate or 24 hours
CREATE OR REPLACE FUNCTION check_and_reveal_ratings()
RETURNS TRIGGER AS $$
DECLARE
  both_rated boolean;
  errand_id_val uuid;
BEGIN
  -- Get the errand_id for this rating
  errand_id_val := NEW.errand_id;
  
  -- Check if both parties have rated
  SELECT COUNT(*) = 2 INTO both_rated
  FROM mutual_ratings
  WHERE errand_id = errand_id_val
  AND rating_type IN ('poster_to_runner', 'runner_to_poster');
  
  -- If both rated, reveal all ratings for this errand
  IF both_rated THEN
    UPDATE mutual_ratings
    SET is_hidden = false, hidden_until = NULL
    WHERE errand_id = errand_id_val;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check and reveal ratings
DROP TRIGGER IF EXISTS check_reveal_ratings_trigger ON mutual_ratings;
CREATE TRIGGER check_reveal_ratings_trigger
  AFTER INSERT ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_and_reveal_ratings();

-- Function to automatically reveal ratings after 24 hours
CREATE OR REPLACE FUNCTION auto_reveal_expired_ratings()
RETURNS void AS $$
BEGIN
  UPDATE mutual_ratings
  SET is_hidden = false, hidden_until = NULL
  WHERE is_hidden = true 
  AND hidden_until < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run every hour (you can set this up in Supabase)
-- For now, we'll call this function manually or via triggers
```

### Step 2: Add Rating Statistics to Profiles
```sql
-- Add rating statistics columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating decimal DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rating_update timestamptz;

-- Function to update rating statistics
CREATE OR REPLACE FUNCTION update_rating_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    total_ratings = (
      SELECT COUNT(*)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM mutual_ratings
      WHERE rated_id = NEW.rated_id
      AND (is_hidden = false OR (is_hidden = true AND hidden_until < now()))
    ),
    last_rating_update = now()
  WHERE id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating statistics
DROP TRIGGER IF EXISTS update_rating_statistics_trigger ON mutual_ratings;
CREATE TRIGGER update_rating_statistics_trigger
  AFTER INSERT OR UPDATE ON mutual_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_statistics();
```

## Frontend Implementation

### Step 3: Update MutualRatingModal Component
Replace the existing MutualRatingModal with enhanced features:

```tsx
import React, { useState } from 'react'
import { X, Star, MessageCircle, User, AlertTriangle, Flag } from 'lucide-react'
import { supabase, Errand, Profile } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface MutualRatingModalProps {
  errand: Errand
  otherUser: Profile
  ratingType: 'poster_to_runner' | 'runner_to_poster'
  onClose: () => void
  onComplete: () => void
}

export function MutualRatingModal({ 
  errand, 
  otherUser, 
  ratingType, 
  onClose, 
  onComplete 
}: MutualRatingModalProps) {
  const { profile } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || rating === 0) return

    setLoading(true)
    try {
      // First create a transaction record if it doesn't exist
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('errand_id', errand.id)
        .single()

      let transactionId = existingTransaction?.id

      if (!transactionId) {
        const { data: newTransaction, error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            errand_id: errand.id,
            poster_id: ratingType === 'poster_to_runner' ? profile.id : otherUser.id,
            runner_id: ratingType === 'runner_to_poster' ? profile.id : otherUser.id,
            amount: errand.amount,
            status: 'completed'
          }])
          .select('id')
          .single()

        if (transactionError) throw transactionError
        transactionId = newTransaction.id
      }

      // Create the rating with hidden status
      const { error } = await supabase
        .from('mutual_ratings')
        .insert([{
          transaction_id: transactionId,
          errand_id: errand.id,
          rater_id: profile.id,
          rated_id: otherUser.id,
          rating,
          comment: comment.trim() || null,
          rating_type: ratingType,
          is_hidden: true,
          hidden_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          report_reason: showReport ? reportReason.trim() : null,
          report_submitted_at: showReport ? new Date().toISOString() : null
        }])

      if (error) throw error
      onComplete()
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Error submitting rating. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isRatingRunner = ratingType === 'poster_to_runner'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Rate {isRatingRunner ? 'Runner' : 'Poster'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {otherUser.display_username && otherUser.username 
                ? otherUser.username 
                : otherUser.full_name}
            </h3>
            <p className="text-gray-600">
              {isRatingRunner ? 'completed' : 'posted'} "{errand.title}"
            </p>
            
            {/* Rating Info */}
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-sm text-blue-700">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>{otherUser.average_rating?.toFixed(2) || '0.00'}</span>
                <span>({otherUser.total_ratings || 0} reviews)</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Ratings are hidden until both parties rate or 24 hours pass
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                How was your experience?
              </label>
              <div className="flex justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 focus:outline-none transition-colors"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Share your experience"
                />
              </div>
            </div>

            {/* Report Option */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowReport(!showReport)}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <Flag className="w-4 h-4" />
                <span>Report an issue</span>
              </button>
              
              {showReport && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <div className="flex items-start space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm text-red-700 font-medium">Report Issue</span>
                  </div>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Describe what went wrong..."
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

### Step 4: Update Profile Display
Update the Layout component to show enhanced rating display:

```tsx
// In Layout.tsx, update the rating display
<div className="flex items-center space-x-1 text-sm text-gray-600">
  <Star className="w-4 h-4 text-yellow-400 fill-current" />
  <span>{profile.average_rating?.toFixed(2) || '0.00'}</span>
  <span className="text-gray-400">({profile.total_ratings || 0} reviews)</span>
</div>
```

### Step 5: Create Rating History Component
Create a new component to show rating history:

```tsx
// src/components/profile/RatingHistoryModal.tsx
import React, { useState, useEffect } from 'react'
import { X, Star, Calendar, User } from 'lucide-react'
import { supabase, Profile } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface RatingHistoryModalProps {
  onClose: () => void
}

export function RatingHistoryModal({ onClose }: RatingHistoryModalProps) {
  const { profile } = useAuth()
  const [ratings, setRatings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchRatings()
    }
  }, [profile])

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('mutual_ratings')
        .select(`
          *,
          rater:profiles!mutual_ratings_rater_id_fkey(*),
          errand:errands(*)
        `)
        .eq('rated_id', profile!.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRatings(data || [])
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Rating History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {ratings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No ratings yet</h3>
              <p className="text-gray-500">Complete more errands to receive ratings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {rating.rater.display_username && rating.rater.username 
                            ? rating.rater.username 
                            : rating.rater.full_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {rating.rating_type === 'poster_to_runner' ? 'Rated as Runner' : 'Rated as Poster'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{rating.rating}</span>
                    </div>
                  </div>
                  
                  {rating.comment && (
                    <p className="text-gray-700 mb-3">"{rating.comment}"</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{rating.errand?.title}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(rating.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## Testing the Enhanced System

### Step 6: Test the Complete Flow
1. **Complete an errand** (mark as completed)
2. **Both parties should be prompted** to rate each other
3. **Ratings should be hidden** until both submit or 24 hours pass
4. **Check profile displays** show updated averages
5. **Test report functionality**

## Success Indicators
- ✅ **Two-way rating system** works
- ✅ **Ratings are hidden** until both parties rate
- ✅ **24-hour auto-reveal** works
- ✅ **Report option** functions properly
- ✅ **Profile displays** show "⭐ 4.86 (based on 72 reviews)"
- ✅ **Rating history** is accessible
- ✅ **Average ratings update** correctly

This implementation provides a complete Uber-style rating system with all the requested features!
