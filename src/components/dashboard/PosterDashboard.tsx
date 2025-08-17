import React, { useState, useEffect } from 'react'
import { Plus, Clock, CheckCircle, XCircle, Eye, DollarSign, MapPin, Calendar, Image as ImageIcon, Users, MessageCircle } from 'lucide-react'
import { supabase, Errand, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { PostErrandModal } from './PostErrandModal'
import { ErrandDetailsModal } from './ErrandDetailsModal'

export function PosterDashboard() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [errands, setErrands] = useState<Errand[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null)

  useEffect(() => {
    if (profile) {
      fetchErrands()
    }
  }, [profile])

  const fetchErrands = async () => {
    try {
      const { data, error } = await supabase
        .from('errands')
        .select(`
          *,
          assigned_runner:profiles!errands_assigned_runner_id_fkey(*)
        `)
        .eq('poster_id', profile!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setErrands(data || [])
    } catch (error) {
      console.error('Error fetching errands:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-gray-700 bg-gray-100'
      case 'in_progress': return 'text-warning bg-warning'
      case 'completed': return 'text-success bg-success'
      case 'cancelled': return 'text-error bg-error'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const renderImage = (errand: Errand) => {
    if (!errand.image_url) {
      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No image</p>
          </div>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My posted errands</h1>
        <p className="text-gray-600">Manage and track your posted errands</p>
      </div>

      {/* Post New Errand Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowPostModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Post new errand</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-left">
            <p className="text-sm text-gray-600 mb-2">Open</p>
            <p className="text-2xl font-bold text-black">{errands.filter(e => e.status === 'open').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-left">
            <p className="text-sm text-gray-600 mb-2">In progress</p>
            <p className="text-2xl font-bold text-black">{errands.filter(e => e.status === 'in_progress').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-left">
            <p className="text-sm text-gray-600 mb-2">Completed</p>
            <p className="text-2xl font-bold text-black">{errands.filter(e => e.status === 'completed').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-left">
            <p className="text-sm text-gray-600 mb-2">Total</p>
            <p className="text-2xl font-bold text-black">{errands.length}</p>
          </div>
        </div>
      </div>

      {/* Errands Grid */}
      {errands.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No errands posted yet</h3>
          <p className="text-gray-600 mb-6">Start by posting your first errand request</p>
          <button
            onClick={() => setShowPostModal(true)}
            className="btn-primary"
          >
            Post Your First Errand
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {errands.map((errand) => (
            <div
              key={errand.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              {/* Top Section - Image with Status Tags Overlaid */}
              <div className="relative">
                <div className="h-64 bg-gray-100 overflow-hidden">
                  {renderImage(errand)}
                </div>
                
                {/* Status Tags Overlaid */}
                <div className="absolute top-3 left-3 flex space-x-2">
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

              {/* Poster Context Section - Light Gray Background */}
              <div className="bg-gray-100 px-4 py-3 mx-4 mb-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {errand.assigned_runner?.avatar_url ? (
                      <img
                        src={errand.assigned_runner.avatar_url}
                        alt={errand.assigned_runner.full_name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-black">
                        {errand.status === 'open' ? 'Waiting for bids' : 'Assigned to runner'}
                      </p>
                      {errand.assigned_runner && (
                        <p className="text-xs text-gray-600">
                          {errand.assigned_runner.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(errand.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(errand.status)}
                      <span className="capitalize">{errand.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Action Button */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => setSelectedErrand(errand)}
                  className="w-full bg-primary text-white py-3 rounded-lg font-medium transition-all hover:bg-primary-dark hover:transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showPostModal && (
        <PostErrandModal
          onClose={() => setShowPostModal(false)}
          onUpdate={() => {
            fetchErrands()
            setShowPostModal(false)
            showToast('Errand posted successfully!', 'success')
          }}
        />
      )}

      {selectedErrand && (
        <ErrandDetailsModal
          errand={selectedErrand}
          onClose={() => setSelectedErrand(null)}
          onUpdate={() => {
            fetchErrands()
            setSelectedErrand(null)
          }}
        />
      )}
    </div>
  )
}