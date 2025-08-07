import React, { useState, useEffect } from 'react'
import { MapPin, DollarSign, Clock, Calendar, Star, User, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { Errand, CATEGORY_ICONS, CATEGORY_COLORS, Bid } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { BidModal } from './BidModal'

interface ErrandCardProps {
  errand: Errand
  onUpdate: () => void
}

export function ErrandCard({ errand, onUpdate }: ErrandCardProps) {
  const { profile } = useAuth()
  const [showBidModal, setShowBidModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [userBid, setUserBid] = useState<Bid | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      checkUserBid()
    }
  }, [profile, errand.id])

  const checkUserBid = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('errand_id', errand.id)
        .eq('runner_id', profile!.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user bid:', error)
      } else if (data) {
        setUserBid(data)
      }
    } catch (error) {
      console.error('Error checking user bid:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const renderImage = () => {
    if (errand.image_url && !imageError) {
      return (
        <img
          src={errand.image_url}
          alt={errand.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )
    }
    
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

  const getBidButtonText = () => {
    if (!userBid) return 'Place Bid'
    if (userBid.status === 'pending') return 'Bid Pending'
    if (userBid.status === 'accepted') return 'Bid Accepted'
    if (userBid.status === 'rejected') return 'Bid Rejected'
    return 'Place Bid'
  }

  const isBidDisabled = () => {
    return userBid && userBid.status !== 'rejected'
  }

  return (
    <>
      <div className="card card-hover overflow-hidden">
        <div className="h-48 bg-gray-100 relative overflow-hidden">
          {renderImage()}
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{errand.title}</h3>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']}`}>
                  {CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS['Others']} {errand.category}
                </span>
              </div>
            </div>
            <span className="text-xl font-bold text-success">₵{errand.amount}</span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{errand.description}</p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{errand.location}</span>
            </div>
            
            {errand.deadline && (
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Due {formatDate(errand.deadline)} at {formatTime(errand.deadline)}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              <span>Posted {formatDate(errand.created_at)}</span>
            </div>
          </div>

          {errand.poster && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {errand.poster.display_username && errand.poster.username 
                        ? errand.poster.username 
                        : errand.poster.full_name}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-warning fill-current" />
                      <span className="text-xs text-gray-500">{errand.poster.average_rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-xs text-gray-400">({errand.poster.total_ratings || 0} tasks)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowBidModal(true)}
            disabled={isBidDisabled() || loading}
            className={`w-full flex items-center justify-center space-x-2 font-medium py-3 px-4 rounded-lg transition-all ${
              isBidDisabled()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{getBidButtonText()}</span>
          </button>

          {userBid && userBid.status === 'pending' && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Your bid is being reviewed by the poster
            </p>
          )}
        </div>
      </div>

      {showBidModal && (
        <BidModal
          errand={errand}
          onClose={() => setShowBidModal(false)}
          onSuccess={() => {
            setShowBidModal(false)
            checkUserBid()
            onUpdate()
          }}
        />
      )}
    </>
  )
}