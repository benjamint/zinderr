import React, { useState } from 'react'
import { X, DollarSign, MessageCircle, User, MapPin } from 'lucide-react'
import { supabase, Errand } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface BidModalProps {
  errand: Errand
  onClose: () => void
  onSuccess: () => void
}

export function BidModal({ errand, onClose, onSuccess }: BidModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [bidAmount, setBidAmount] = useState(errand.amount.toString())
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('bids')
        .insert([{
          errand_id: errand.id,
          runner_id: profile.id,
          amount: parseFloat(bidAmount),
          message: message.trim() || null
        }])

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('You have already placed a bid on this errand.')
        } else {
          throw error
        }
      } else {
        onSuccess()
      }
    } catch (error) {
      console.error('Error placing bid:', error)
      alert('Error placing bid. Please try again.')
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

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Place Your Bid</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{errand.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{errand.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Posted Amount:</span>
                <span className="font-semibold text-success">₵{errand.amount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Location:</span>
                <span className="text-gray-900">{errand.location}</span>
              </div>
              {errand.deadline && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Deadline:</span>
                  <span className="text-gray-900">{formatDate(errand.deadline)}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Bid Amount (₵)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  className="input-modern w-full pl-10 pr-4"
                  placeholder="Enter your bid amount"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can bid lower than the posted amount to be competitive
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Poster
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="input-modern w-full resize-none"
                placeholder="Introduce yourself and explain why you're the best person for this errand..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !bidAmount}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Bid'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}