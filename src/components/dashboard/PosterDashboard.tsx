import React, { useState, useEffect } from 'react'
import { Plus, Clock, CheckCircle, XCircle, Eye, DollarSign, MapPin, Calendar, Image as ImageIcon } from 'lucide-react'
import { supabase, Errand, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PostErrandModal } from './PostErrandModal'
import { ErrandDetailsModal } from './ErrandDetailsModal'

export function PosterDashboard() {
  const { profile } = useAuth()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const renderImage = (errand: Errand) => {
    if (errand.image_url) {
      return (
        <img
          src={errand.image_url}
          alt={errand.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Errands</h1>
          <p className="text-gray-600 mt-1">Manage your posted errands</p>
        </div>
        <button
          onClick={() => setShowPostModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Post New Errand</span>
        </button>
      </div>

      {errands.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No errands posted yet</h3>
          <p className="text-gray-500 mb-6">Get started by posting your first errand</p>
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
              className="card card-hover overflow-hidden"
            >
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                {renderImage(errand)}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{errand.title}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']}`}>
                        {CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS['Others']} {errand.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(errand.status)}`}>
                        {getStatusIcon(errand.status)}
                        <span className="capitalize">{errand.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-success">₵{errand.amount}</span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{errand.description}</p>
                
                <div className="space-y-2 mb-4">
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
                      <span>Due {formatDate(errand.deadline)}</span>
                    </div>
                  )}
                </div>

                {errand.assigned_runner && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Assigned to:</p>
                    <p className="font-medium text-gray-900">{errand.assigned_runner.full_name}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedErrand(errand)}
                  className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPostModal && (
        <PostErrandModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false)
            fetchErrands()
          }}
        />
      )}

      {selectedErrand && (
        <ErrandDetailsModal
          errand={selectedErrand}
          onClose={() => setSelectedErrand(null)}
          onUpdate={fetchErrands}
        />
      )}
    </div>
  )
}