import React, { useState, useEffect } from 'react'
import { X, MapPin, DollarSign, Clock, Calendar, Star, User, MessageCircle, Edit, CheckCircle, XCircle, Image as ImageIcon, Check } from 'lucide-react'
import { supabase, Errand, Bid, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { EditErrandModal } from './EditErrandModal'
import { MutualRatingModal } from './MutualRatingModal'

interface ErrandDetailsModalProps {
  errand: Errand
  onClose: () => void
  onUpdate: () => void
}

export function ErrandDetailsModal({ errand, onClose, onUpdate }: ErrandDetailsModalProps) {
  const { profile } = useAuth()
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMutualRating, setShowMutualRating] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    fetchBids()
  }, [errand.id])

  const fetchBids = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          runner:profiles!bids_runner_id_fkey(*)
        `)
        .eq('errand_id', errand.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBids(data || [])
    } catch (error) {
      console.error('Error fetching bids:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptBid = async (bidId: string) => {
    try {
      // Update errand to assign runner and change status
      const { error: errandError } = await supabase
        .from('errands')
        .update({
          assigned_runner_id: bids.find(b => b.id === bidId)?.runner_id,
          status: 'in_progress'
        })
        .eq('id', errand.id)

      if (errandError) throw errandError

      // Update bid status
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId)

      if (bidError) throw bidError

      // Reject all other bids
      const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('errand_id', errand.id)
        .neq('id', bidId)

      if (rejectError) throw rejectError

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error accepting bid:', error)
      alert('Error accepting bid. Please try again.')
    }
  }

  const handleRejectBid = async (bidId: string) => {
    try {
      const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)

      if (error) throw error
      fetchBids()
    } catch (error) {
      console.error('Error rejecting bid:', error)
      alert('Error rejecting bid. Please try again.')
    }
  }

  const markCompleted = async () => {
    setCompleting(true)
    try {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed' })
        .eq('id', errand.id)

      if (error) throw error
      
      setShowMutualRating(true)
    } catch (error) {
      console.error('Error marking as completed:', error)
      alert('Error updating errand. Please try again.')
    } finally {
      setCompleting(false)
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

  const isPoster = profile?.id === errand.poster_id
  const isRunner = profile?.id === errand.assigned_runner_id
  const canMarkCompleted = isPoster && errand.status === 'in_progress'

  if (loading) {
    return (
      <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="modal-content max-w-2xl w-full">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Errand Details</h2>
            <div className="flex items-center space-x-2">
              {isPoster && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Errand Details */}
              <div>
                <div className="h-64 bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {renderImage()}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{errand.title}</h3>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']}`}>
                        {CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS['Others']} {errand.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        errand.status === 'open' ? 'bg-gray-100 text-gray-700' :
                        errand.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        errand.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {errand.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600">{errand.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span className="font-semibold text-success">₵{errand.amount}</span>
                    </div>
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

                  {errand.assigned_runner && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-600 mb-1">Assigned to:</p>
                      <p className="font-medium text-gray-900">{errand.assigned_runner.full_name}</p>
                    </div>
                  )}

                  {/* Mark as Completed Button */}
                  {canMarkCompleted && (
                    <button
                      onClick={markCompleted}
                      disabled={completing}
                      className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      <span>{completing ? 'Marking as Completed...' : 'Mark as Completed'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bids Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Bids ({bids.length})</h4>
                
                {bids.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No bids yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bids.map((bid) => (
                      <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {bid.runner?.display_username && bid.runner?.username 
                                  ? bid.runner.username 
                                  : bid.runner?.full_name}
                              </p>
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3 text-warning fill-current" />
                                <span className="text-xs text-gray-500">{bid.runner?.average_rating?.toFixed(1) || '0.0'}</span>
                                <span className="text-xs text-gray-400">({bid.runner?.total_ratings || 0} tasks)</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-success">₵{bid.amount}</p>
                            <p className="text-xs text-gray-500">{formatDate(bid.created_at)}</p>
                          </div>
                        </div>
                        
                        {bid.message && (
                          <p className="text-gray-600 text-sm mb-3">"{bid.message}"</p>
                        )}

                        {isPoster && bid.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptBid(bid.id)}
                              className="btn-primary flex items-center space-x-1 text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleRejectBid(bid.id)}
                              className="btn-secondary flex items-center space-x-1 text-sm"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {bid.status !== 'pending' && (
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bid.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditErrandModal
          errand={errand}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
      )}

      {showMutualRating && errand.assigned_runner && (
        <MutualRatingModal
          errand={errand}
          otherUser={errand.assigned_runner}
          ratingType="poster_to_runner"
          onClose={() => {
            setShowMutualRating(false)
            onUpdate()
            onClose()
          }}
          onComplete={() => {
            setShowMutualRating(false)
            onUpdate()
            onClose()
          }}
        />
      )}
    </>
  )
}