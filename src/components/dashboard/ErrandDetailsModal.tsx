import React, { useState, useEffect } from 'react'
import { X, MapPin, DollarSign, Clock, Calendar, Star, User, Edit, CheckCircle, XCircle, Image as ImageIcon, Check, MessageCircle, FileText, Users, History, RotateCcw, AlertTriangle } from 'lucide-react'
import { supabase, Errand, Bid, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { EditErrandModal } from './EditErrandModal'
import { MutualRatingModal } from './MutualRatingModal'

interface ErrandDetailsModalProps {
  errand: Errand
  onClose: () => void
  onUpdate: () => void
}

type TabType = 'details' | 'bids' | 'timeline'

export function ErrandDetailsModal({ errand, onClose, onUpdate }: ErrandDetailsModalProps) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMutualRating, setShowMutualRating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  useEffect(() => {
    fetchBids()
    checkExistingRating()
  }, [errand.id])

  const checkExistingRating = async () => {
    if (!profile) return
    
    try {
      const { data, error } = await supabase
        .from('mutual_ratings')
        .select('id')
        .eq('errand_id', errand.id)
        .eq('rater_id', profile.id)
        .single()

      if (data) {
        setRatingSubmitted(true)
      }
    } catch (error) {
      // No rating found, which is fine
    }
  }

  const fetchBids = async () => {
    try {
      setLoading(true)

      
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
      showToast('Bid accepted!', 'success')
    } catch (error) {
      console.error('Error accepting bid:', error)
      showToast('Error accepting bid. Please try again.', 'error')
    }
  }

  const handleRejectBid = async (bidId: string) => {
    try {
      const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)

      if (error) throw error
      fetchBids() // Re-fetch bids to update UI
      showToast('Bid rejected.', 'info')
    } catch (error) {
      console.error('Error rejecting bid:', error)
      showToast('Error rejecting bid. Please try again.', 'error')
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

      showToast('Errand marked as completed!', 'success')
      
      // Show rating modal for poster to rate the runner
      if (isPoster && errand.assigned_runner) {
        setShowMutualRating(true)
      } else {
        // For runners or if no assigned runner, refresh the page
        window.location.reload()
      }
    } catch (error) {
      console.error('Error marking as completed:', error)
      showToast('Error marking as completed. Please try again.', 'error')
      setCompleting(false) // Re-enable button on error
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderImage = () => {
    if (!errand.image_url) {
      return (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
      )
    }

    return (
      <img
        src={errand.image_url}
        alt={errand.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          target.nextElementSibling?.classList.remove('hidden')
        }}
      />
    )
  }

  const isPoster = profile?.id === errand.poster_id
  const isRunner = profile?.id === errand.assigned_runner_id
  const canMarkCompleted = isPoster && errand.status === 'in_progress'
  const canTrackLocation = errand.status === 'in_progress' && errand.assigned_runner_id

  // Show different tabs based on user type
  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    // Only show bids tab for posters
    ...(isPoster ? [{ id: 'bids', label: 'Bids', icon: Users }] : []),
    { id: 'timeline', label: 'Timeline', icon: History }
  ]

  return (
    <>

      <div className="modal-backdrop fixed inset-0 flex items-center justify-end z-50">
        <div className="modal-content w-96 h-full max-h-screen overflow-y-auto transform translate-x-0 transition-transform duration-300 ease-in-out">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {isPoster ? 'Errand details' : 'Task overview'}
            </h2>
            <div className="flex items-center space-x-2">
              {isPoster && errand.status !== 'completed' && (
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

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'details' ? (
              /* Details Tab */
              <div className="space-y-6">
                {/* Errand Details */}
                <div>
                  <div className="h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
                    {renderImage()}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{errand.title}</h3>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']}`}>
                          {CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']} {errand.category}
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
                    <p className="text-gray-600 text-sm">{errand.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">₵{errand.amount}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{errand.location}</span>
                      </div>
                      {errand.deadline && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Due {formatDate(errand.deadline)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Posted {formatDate(errand.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Show different content based on user type */}
                    {isPoster ? (
                      // Poster view - show assigned runner info
                      errand.assigned_runner && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-3">
                            {errand.assigned_runner.avatar_url ? (
                              <img
                                src={errand.assigned_runner.avatar_url}
                                alt={errand.assigned_runner.full_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Assigned to:</p>
                              <p className="font-medium text-gray-900">{errand.assigned_runner.full_name}</p>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // Runner view - show poster info
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-3">
                          {errand.poster?.avatar_url ? (
                            <img
                              src={errand.poster.avatar_url}
                              alt={errand.poster.full_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Posted by:</p>
                            <p className="font-medium text-gray-900">{errand.poster?.full_name || 'Unknown'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Different for posters vs runners */}
                    <div className="space-y-3">
                      {isPoster ? (
                        // Poster actions
                        <>
                          {canMarkCompleted && (
                            <button
                              onClick={markCompleted}
                              disabled={completing}
                              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                              <span>{completing ? 'Marking as completed...' : 'Mark as completed'}</span>
                            </button>
                          )}
                          
                          {/* Rating button for completed tasks */}
                          {errand.status === 'completed' && errand.assigned_runner && !ratingSubmitted && (
                            <button
                              onClick={() => setShowMutualRating(true)}
                              className="btn-secondary w-full flex items-center justify-center space-x-2"
                            >
                              <Star className="w-4 h-4" />
                              <span>Rate runner</span>
                            </button>
                          )}
                        </>
                      ) : (
                        // Runner actions - simplified view
                        <>
                          {errand.status === 'in_progress' && (
                            <button
                              onClick={markCompleted}
                              disabled={completing}
                              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                              <span>{completing ? 'Marking as completed...' : 'Mark as completed'}</span>
                            </button>
                          )}
                          
                          {errand.status === 'completed' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-green-800 font-medium">Task Completed!</p>
                              <p className="text-sm text-gray-600">Great job! You've completed this errand.</p>
                              
                              {/* Rating button for runners */}
                              {!ratingSubmitted && (
                                <button
                                  onClick={() => setShowMutualRating(true)}
                                  className="btn-secondary mt-3 w-full flex items-center justify-center space-x-2"
                                >
                                  <Star className="w-4 h-4" />
                                  <span>Rate poster</span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  {errand.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Additional notes</h4>
                      <p className="text-sm text-gray-600">{errand.notes}</p>
                    </div>
                  )}
                  
                  {/* Show task overview for runners */}
                  {!isPoster && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Task overview</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        This is the errand you've been assigned to complete. 
                        {errand.status === 'in_progress' && ' Click the "Mark as Completed" button when you finish.'}
                        {errand.status === 'completed' && ' This task has been completed successfully!'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'bids' ? (
              /* Bids Tab - Only show for posters */
              isPoster ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Bids ({bids.length})</h4>
                  {bids.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No bids yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bids.map((bid) => (
                        <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            {bid.runner?.avatar_url ? (
                              <img
                                src={bid.runner.avatar_url}
                                alt={bid.runner.full_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="font-medium text-gray-900">{bid.runner?.full_name}</h5>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  bid.status === 'retracted' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600">
                                  {bid.runner?.average_rating?.toFixed(1) || '0.0'} ({bid.runner?.total_ratings || 0} reviews)
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-2">
                                Bid placed: {formatDate(bid.created_at)}
                              </div>
                              <div className="text-lg font-bold text-success mb-3">
                                ₵{bid.amount}
                              </div>
                            </div>
                          </div>
                          
                          {bid.message && (
                            <p className="text-sm text-gray-600 mb-3 p-3 bg-gray-50 rounded-lg">{bid.message}</p>
                          )}
                          
                          {/* Action buttons for pending bids */}
                          {bid.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAcceptBid(bid.id)}
                                className="btn-primary flex items-center space-x-1 text-sm px-3 py-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleRejectBid(bid.id)}
                                className="btn-secondary flex items-center space-x-1 text-sm px-3 py-1"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                          
                          {/* Show retraction info for retracted bids */}
                          {bid.status === 'retracted' && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                              {bid.retracted_at && (
                                <div className="mb-1">Retracted: {new Date(bid.retracted_at).toLocaleDateString()}</div>
                              )}
                              {bid.retraction_reason && (
                                <div>Reason: {bid.retraction_reason}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Bids are only visible to the errand poster</p>
                </div>
              )
            ) : activeTab === 'timeline' ? (
              /* Timeline Tab */
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Task timeline</h4>
                {bids.length === 0 && errand.status === 'open' ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Task completion entry */}
                    {errand.status === 'completed' && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">Task completed</h5>
                              <span className="text-sm text-gray-600">
                                {errand.updated_at ? new Date(errand.updated_at).toLocaleDateString() : 'Recently'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              This errand has been marked as completed successfully.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rating entries */}
                    {ratingSubmitted && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Star className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">Rating submitted</h5>
                              <span className="text-sm text-gray-600">Recently</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {isPoster ? 'You rated the runner' : 'You rated the poster'} for this completed task.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bid timeline entries */}
                    {bids.map((bid) => (
                      <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          {bid.runner?.avatar_url ? (
                            <img
                              src={bid.runner.avatar_url}
                              alt={bid.runner.full_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{bid.runner?.full_name}</h5>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                bid.status === 'retracted' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>Bid placed: {new Date(bid.created_at).toLocaleDateString()} at {new Date(bid.created_at).toLocaleTimeString()}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Amount: ₵{bid.amount}</span>
                              </div>
                              
                              {bid.message && (
                                <div className="flex items-start space-x-2">
                                  <MessageCircle className="w-4 h-4 mt-0.5" />
                                  <span>Message: {bid.message}</span>
                                </div>
                              )}
                              
                              {bid.status === 'retracted' && bid.retracted_at && (
                                <div className="flex items-center space-x-2 text-red-600">
                                  <RotateCcw className="w-4 h-4" />
                                  <span>Retracted: {new Date(bid.retracted_at).toLocaleDateString()} at {new Date(bid.retracted_at).toLocaleTimeString()}</span>
                                </div>
                              )}
                              
                              {bid.status === 'retracted' && bid.retraction_reason && (
                                <div className="flex items-start space-x-2 text-red-600">
                                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                                  <span>Reason: {bid.retraction_reason}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditErrandModal
          errand={errand}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            onUpdate()
            onClose()
          }}
          onDelete={() => {
            onUpdate()
            onClose()
          }}
        />
      )}
      
      {showMutualRating && errand.assigned_runner && (
        <MutualRatingModal
          errand={errand}
          otherUser={isPoster ? errand.assigned_runner : (errand.poster || errand.assigned_runner)}
          ratingType={isPoster ? "poster_to_runner" : "runner_to_poster"}
          onClose={() => {
            setShowMutualRating(false)
            onUpdate()
            onClose()
          }}
          onComplete={(ratingData) => {
            setShowMutualRating(false)
            setRatingSubmitted(true)
            onUpdate()
            onClose()
          }}
        />
      )}
    </>
  )
}