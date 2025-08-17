import React, { useState, useEffect } from 'react'
import { X, DollarSign, MessageCircle, User, MapPin, RotateCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { supabase, Errand, Bid } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface BidModalProps {
  errand: Errand
  onClose: () => void
  onUpdate: () => void
}

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  const icon = type === 'success' ? <CheckCircle className="w-5 h-5" /> : type === 'error' ? <XCircle className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-64`}>
      {icon}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function BidModal({ errand, onClose, onUpdate }: BidModalProps) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [existingBid, setExistingBid] = useState<Bid | null>(null)
  const [showRetractConfirm, setShowRetractConfirm] = useState(false)
  const [retracting, setRetracting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    if (profile) {
      fetchExistingBid()
    }
  }, [profile, errand.id])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
  }

  const fetchExistingBid = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('errand_id', errand.id)
        .eq('runner_id', profile!.id)
        .neq('status', 'retracted') // Exclude retracted bids
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing bid:', error)
        return
      }

      if (data) {
        setExistingBid(data)
        setAmount(data.amount.toString())
        setMessage(data.message || '')
      } else {
        // Clear the form if no active bid exists
        setExistingBid(null)
        setAmount('')
        setMessage('')
      }
    } catch (error) {
      console.error('Error fetching existing bid:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || !profile) {
      return
    }

    try {
      setSubmitting(true)
      
      if (existingBid) {
        // Update existing bid
        const { error } = await supabase
          .from('bids')
          .update({
            amount: parseFloat(amount),
            message: message.trim() || undefined,
            status: 'pending',
            retracted_at: null,
            retraction_reason: null
          })
          .eq('id', existingBid.id)

        if (error) throw error
        showToast('Bid updated successfully!', 'success')
        
        // Update local state immediately
        setExistingBid({ ...existingBid, amount: parseFloat(amount), message: message.trim() || undefined, status: 'pending' })
      } else {
        // Check if there's a retracted bid that we need to update instead of creating new
        
        const { data: retractedBid, error: checkError } = await supabase
          .from('bids')
          .select('*')
          .eq('errand_id', errand.id)
          .eq('runner_id', profile.id)
          .eq('status', 'retracted')
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking for retracted bids:', checkError)
        }

        if (retractedBid) {
          // Update the retracted bid instead of creating new
          const { error } = await supabase
            .from('bids')
            .update({
              amount: parseFloat(amount),
              message: message.trim() || undefined,
              status: 'pending',
              retracted_at: null,
              retraction_reason: null
            })
            .eq('id', retractedBid.id)

          if (error) throw error
          showToast('Bid placed successfully!', 'success')
          
          // Set local state immediately
          setExistingBid({ ...retractedBid, amount: parseFloat(amount), message: message.trim() || undefined, status: 'pending' })
        } else {
          // Create new bid
          const { data, error } = await supabase
            .from('bids')
            .insert({
              errand_id: errand.id,
              runner_id: profile.id,
              amount: parseFloat(amount),
              message: message.trim() || undefined,
              status: 'pending'
            })
            .select()
            .single()

          if (error) throw error
          showToast('Bid placed successfully!', 'success')
          
          // Set local state immediately
          setExistingBid(data)
        }
      }

      // Call onUpdate to refresh parent component
      onUpdate()
      
      // Don't close modal immediately, let user see the success
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('❌ Error submitting bid:', error)
      showToast('Error submitting bid. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetractBid = async () => {
    if (!existingBid) return

    try {
      setRetracting(true)
      
      // Use the database function to retract the bid
      const { error } = await supabase
        .rpc('retract_bid', {
          bid_id: existingBid.id,
          retraction_reason: 'Runner retracted bid'
        })

      if (error) throw error

      
      showToast('Bid retracted successfully!', 'success')
      
      // Update local state immediately
      setExistingBid({ ...existingBid, status: 'retracted' })
      
      setShowRetractConfirm(false)
      
      // Call onUpdate to refresh parent component
      onUpdate()
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error retracting bid:', error)
      showToast('Error retracting bid. Please try again.', 'error')
    } finally {
      setRetracting(false)
    }
  }

  const canRetract = Boolean(existingBid?.status === 'pending')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'retracted': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {existingBid?.status === 'rejected' ? 'Update bid' : 
             existingBid ? 'View bid details' : 'Place bid'
            }
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Errand Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{errand.title}</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Budget:</span>
                <span className="text-sm font-semibold text-success">₵{errand.amount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Location:</span>
                <span className="text-sm text-gray-900">{errand.location}</span>
              </div>
            </div>
          </div>

          {/* Existing Bid Status */}
          {existingBid && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Current bid status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(existingBid.status)}`}>
                  {existingBid.status}
                </span>
              </div>
              
              {existingBid.status === 'retracted' && (
                <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2 mb-1">
                    <RotateCcw className="w-4 h-4" />
                    <span className="font-medium">Bid retracted</span>
                  </div>
                  {existingBid.retracted_at && (
                    <p>Retracted on {new Date(existingBid.retracted_at).toLocaleDateString()}</p>
                  )}
                  {existingBid.retraction_reason && (
                    <p>Reason: {existingBid.retraction_reason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Your bid amount (₵)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter your bid amount"
                className="input-modern"
                step="0.01"
                min="0"
                required
                disabled={Boolean(existingBid && existingBid.status === 'pending')}
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the poster why you're the best person for this errand..."
                className="input-modern"
                rows={3}
                disabled={Boolean(existingBid && existingBid.status === 'pending')}
              />
            </div>

            {/* Show different buttons based on bid status */}
            {!existingBid || existingBid?.status === 'rejected' ? (
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>{existingBid ? 'Update bid' : 'Place bid'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : existingBid?.status === 'pending' ? (
              <div className="flex space-x-3">
                {/* Show update and retract buttons for pending bids side by side */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>Update bid</span>
                    </>
                  )}
                </button>
                
                {canRetract && (
                  <button
                    type="button"
                    onClick={() => setShowRetractConfirm(true)}
                    className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                    title="Retract your current bid"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retract bid</span>
                  </button>
                )}
              </div>
            ) : null}
          </form>
        </div>
      </div>

      {/* Retract Confirmation Modal */}
      {showRetractConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
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

            {existingBid?.status === 'accepted' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Important notice</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  You are retracting an accepted bid. The errand will be reset to open status and the poster will need to accept a new bid.
                </p>
              </div>
            )}

            <p className="text-gray-700 mb-6">
              Are you sure you want to retract your bid for "{errand.title}"?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowRetractConfirm(false)}
                className="btn-secondary flex-1"
                disabled={retracting}
              >
                Cancel
              </button>
              <button
                onClick={handleRetractBid}
                disabled={retracting}
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

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}