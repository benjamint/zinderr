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
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-md w-full max-h-[90vh] overflow-y-auto">
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
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
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
            <div className="mt-3 p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-center space-x-1 text-sm text-gray-700">
                <Star className="w-4 h-4 text-warning fill-current" />
                <span>{otherUser.average_rating?.toFixed(2) || '0.00'}</span>
                <span>({otherUser.total_ratings || 0} reviews)</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
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
                          ? 'text-warning fill-current'
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
                  className="input-modern w-full pl-10 pr-4 resize-none"
                  placeholder="Share your experience"
                />
              </div>
            </div>

            {/* Report Option */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowReport(!showReport)}
                className="flex items-center space-x-2 text-error hover:text-error text-sm font-medium"
              >
                <Flag className="w-4 h-4" />
                <span>Report an issue</span>
              </button>
              
              {showReport && (
                <div className="mt-3 p-3 bg-error rounded-lg">
                  <div className="flex items-start space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-white mt-0.5" />
                    <span className="text-sm text-white font-medium">Report Issue</span>
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
                className="btn-secondary flex-1"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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