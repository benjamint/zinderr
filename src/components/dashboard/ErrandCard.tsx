import React, { useState, useEffect } from 'react'
import { MapPin, DollarSign, Clock, Calendar, Star, User, MessageCircle, RotateCcw, AlertTriangle } from 'lucide-react'
import { supabase, Errand, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { BidModal } from './BidModal'

interface ErrandCardProps {
  errand: Errand
  onUpdate: () => void
  lastUpdate?: number
}

export function ErrandCard({ errand, onUpdate, lastUpdate }: ErrandCardProps) {
  const { profile } = useAuth()
  const [showBidModal, setShowBidModal] = useState(false)
  const [showRetractConfirm, setShowRetractConfirm] = useState(false)
  const [userBid, setUserBid] = useState<any>(null)
  const [loadingBid, setLoadingBid] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [retractionReason, setRetractionReason] = useState('')
  const [retracting, setRetracting] = useState(false)

  useEffect(() => {
    if (profile?.user_type === 'runner') {
      checkUserBid()
      // Also clean up any old retracted bids to allow re-bidding
      cleanupOldRetractedBids()
    }
  }, [errand.id, profile?.id, lastUpdate])

  // Also refresh when the component mounts or when profile changes
  useEffect(() => {
    if (profile?.user_type === 'runner') {
      checkUserBid()
      // Also clean up any old retracted bids to allow re-bidding
      cleanupOldRetractedBids()
    }
  }, [profile])

  const checkUserBid = async () => {
    try {
      setLoadingBid(true)
      
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('errand_id', errand.id)
        .eq('runner_id', profile?.id)
        .neq('status', 'retracted') // Exclude retracted bids
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user bid:', error)
        return
      }

      setUserBid(data)
    } catch (error) {
      console.error('Error checking user bid:', error)
    } finally {
      setLoadingBid(false)
    }
  }

  // Function to clean up old retracted bids and allow re-bidding
  const cleanupOldRetractedBids = async () => {
    try {

      
      // Find any existing retracted bids for this runner and errand
      const { data: oldBids, error: fetchError } = await supabase
        .from('bids')
        .select('*')
        .eq('errand_id', errand.id)
        .eq('runner_id', profile?.id)
        .eq('status', 'retracted')

      if (fetchError) {
        console.error('Error fetching old retracted bids:', fetchError)
        return
      }

      if (oldBids && oldBids.length > 0) {

        
        // Delete the old retracted bids to allow re-bidding
        const { error: deleteError } = await supabase
          .from('bids')
          .delete()
          .eq('errand_id', errand.id)
          .eq('runner_id', profile?.id)
          .eq('status', 'retracted')

        if (deleteError) {
          console.error('Error deleting old retracted bids:', deleteError)
          return
        }

        
        // Refresh the bid data
        checkUserBid()
      }
    } catch (error) {
      console.error('Error cleaning up old retracted bids:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getBidButtonDisabled = () => {
    if (loadingBid) return true
    if (!userBid) return false
    
    // Only disable button if bid is accepted
    return userBid.status === 'accepted'
  }

  const handleBidButtonClick = () => {
    if (!userBid || userBid.status === 'rejected' || userBid.status === 'retracted') {
      // No bid exists or bid was rejected/retracted - show bid modal
      setShowBidModal(true)
    } else if (userBid.status === 'pending') {
      // Bid is pending - show bid modal to update
      setShowBidModal(true)
    }
  }

  const retractionReasons = [
    "I'm no longer available",
    "Offered amount doesn't work for me",
    "Distance is longer than expected",
    "Other"
  ]

  const handleRetractBid = async () => {
    if (!userBid || !retractionReason) return

    try {
      setRetracting(true)
      
      // Update the bid status directly instead of using the RPC function
      const { error } = await supabase
        .from('bids')
        .update({
          status: 'retracted',
          retracted_at: new Date().toISOString(),
          retraction_reason: retractionReason
        })
        .eq('id', userBid.id)

      if (error) throw error

      
      // Reset the retraction reason
      setRetractionReason('')
      // Close the confirmation modal
      setShowRetractConfirm(false)
      // Clear the userBid state so runner can bid again
      setUserBid(null)
      // Refresh the bid data
      checkUserBid()
      // Call onUpdate to refresh parent component
      onUpdate()
    } catch (error) {
      console.error('Error retracting bid:', error)
    } finally {
      setRetracting(false)
    }
  }

  const renderImage = () => {
    if (imageError || !errand.image_url) {
      // Default placeholder with location icon
      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No errand image</p>
          </div>
        </div>
      )
    }

    return (
      <img
        src={errand.image_url}
        alt={errand.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Top Section - Image with Status Tags Overlaid */}
        <div className="relative">
          <div className="h-64 bg-gray-100 overflow-hidden">
            {renderImage()}
          </div>
          
          {/* Status Tags Overlaid */}
          <div className="absolute top-3 left-3 flex space-x-3">
            <span className="bg-green-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
              {errand.status === 'open' ? 'OPEN' : errand.status.toUpperCase()}
            </span>
            <span className="bg-green-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
              {errand.category?.toUpperCase() || 'TASK'}
            </span>
          </div>
        </div>

        {/* Middle Section - Task Details */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-black mb-2">{errand.title}</h3>
          
          {/* Description */}
          <p className="text-sm text-black mb-3 leading-relaxed line-clamp-2">{errand.description}</p>
          
          {/* Price */}
          <div className="text-2xl font-bold text-green-600 mb-4">₵{errand.amount}</div>
          
          {/* Key Information with Icons */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-black">{formatDate(errand.created_at)}</span>
            </div>
            
            {errand.deadline && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-black">Due: {formatDate(errand.deadline)}, {formatTime(errand.deadline)}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-black">{errand.location}</span>
            </div>
          </div>
        </div>

        {/* Poster Information Section - Light Gray Background */}
        {errand.poster && (
          <div className="bg-gray-100 px-4 py-3 mx-4 mb-4 rounded-lg">
            <div className="flex items-center space-x-3">
              {errand.poster.avatar_url ? (
                <img
                  src={errand.poster.avatar_url}
                  alt={errand.poster.full_name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-black">
                  Posted by {errand.poster.display_username && errand.poster.username 
                    ? errand.poster.username 
                    : errand.poster.full_name}
                </p>
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-black fill-current" />
                  <span className="text-xs text-black">{errand.poster.average_rating?.toFixed(1) || '0.0'} ({errand.poster.total_ratings || 0} reviews)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section - Action Button */}
        <div className="px-4 pb-4">
          {!userBid || userBid.status === 'rejected' || userBid.status === 'retracted' ? (
            // No bid or bid was rejected/retracted - show Place Bid button
            <div className="space-y-3">
              <button
                onClick={handleBidButtonClick}
                disabled={getBidButtonDisabled()}
                className="btn-primary w-full"
              >
                Place bid
              </button>

            </div>
          ) : userBid.status === 'pending' ? (
            // Bid is pending - show Update Bid and Retract Bid buttons side by side
            <div className="flex space-x-3">
              <button
                onClick={handleBidButtonClick}
                className="btn-primary flex-1"
              >
                Update bid
              </button>
              <button
                onClick={() => setShowRetractConfirm(true)}
                className="btn-secondary flex-1"
              >
                Retract bid
              </button>
            </div>
          ) : userBid.status === 'accepted' ? (
            // Bid accepted - show disabled button
            <button
              disabled
              className="w-full bg-gray-400 text-white py-3 rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              Bid accepted
            </button>
          ) : null}
        </div>
      </div>

      {/* Bid Modal */}
      {showBidModal && (
        <BidModal
          errand={errand}
          onClose={() => setShowBidModal(false)}
          onUpdate={() => {
            onUpdate()
            setShowBidModal(false)
          }}
        />
      )}

      {/* Retract Confirmation Modal */}
      {showRetractConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm bid retraction</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="retraction-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for retraction *
              </label>
              <select
                id="retraction-reason"
                value={retractionReason}
                onChange={(e) => setRetractionReason(e.target.value)}
                className="input-modern w-full"
                required
              >
                <option value="">Select a reason</option>
                {retractionReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to retract your bid for "{errand.title}"?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRetractConfirm(false)
                  setRetractionReason('')
                }}
                className="btn-secondary flex-1"
                disabled={retracting}
              >
                Cancel
              </button>
              <button
                onClick={handleRetractBid}
                disabled={retracting || !retractionReason}
                className="btn-danger flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retracting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Retracting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Yes, retract bid</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}