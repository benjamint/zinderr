import React, { useState, useEffect } from 'react'
import { X, MapPin, DollarSign, Clock, Calendar, Star, User, CheckCircle, Navigation, Eye, ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase, Errand, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { MutualRatingModal } from './MutualRatingModal'
import { LocationTracker } from '../location/LocationTracker'
import { ErrandDetailsModal } from './ErrandDetailsModal'

interface MyTasksModalProps {
  onClose: () => void
}

export function MyTasksModal({ onClose }: MyTasksModalProps) {
  const { profile } = useAuth()
  const [assignedErrands, setAssignedErrands] = useState<Errand[]>([])
  const [loading, setLoading] = useState(true)
  const [showMutualRating, setShowMutualRating] = useState(false)
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null)
  const [showLocation, setShowLocation] = useState(false)
  const [showErrandDetails, setShowErrandDetails] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchAssignedErrands()
  }, [])

  const fetchAssignedErrands = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('errands')
        .select(`
          *,
          poster:profiles!errands_poster_id_fkey(*)
        `)
        .eq('assigned_runner_id', profile?.id)
        .in('status', ['in_progress', 'completed'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssignedErrands(data || [])
    } catch (error) {
      console.error('Error fetching assigned errands:', error)
    } finally {
      setLoading(false)
    }
  }

  const markCompleted = async (errandId: string) => {
    setCompleting(errandId)
    try {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed' })
        .eq('id', errandId)

      if (error) throw error
      
      // Find the errand to show rating modal
      const errand = assignedErrands.find(e => e.id === errandId)
      if (errand) {
        setSelectedErrand(errand)
        setShowMutualRating(true)
      }
      
      // Refresh the list
      fetchAssignedErrands()
    } catch (error) {
      console.error('Error marking as completed:', error)
      alert('Error updating errand. Please try again.')
    } finally {
      setCompleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    return status.replace('_', ' ')
  }

  // Pagination logic
  const totalPages = Math.ceil(assignedErrands.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentErrands = assignedErrands.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="modal-content max-w-6xl w-full">
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
        <div className="modal-content max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My assigned tasks</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {assignedErrands.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned tasks</h3>
                <p className="text-gray-600">You haven't been assigned any errands yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Navigation className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600">In progress</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {assignedErrands.filter(e => e.status === 'in_progress').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600">Completed</p>
                        <p className="text-2xl font-bold text-green-900">
                          {assignedErrands.filter(e => e.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-600">Total tasks</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {assignedErrands.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Task details</h3>
                    <p className="text-sm text-gray-600">View and manage your assigned errands</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date posted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentErrands.map((errand) => (
                          <tr key={errand.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(errand.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg">{CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_ICONS] || '📋'}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{errand.title}</div>
                                  <div className="text-sm text-gray-500">₵{errand.amount}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{errand.location}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(errand.status)}`}>
                                {getStatusText(errand.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedErrand(errand)
                                    setShowErrandDetails(true)
                                  }}
                                  className="text-primary hover:text-primary-dark flex items-center space-x-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View details</span>
                                </button>
                                
                                {errand.status === 'in_progress' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedErrand(errand)
                                        setShowLocation(true)
                                      }}
                                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                    >
                                      <Navigation className="w-4 h-4" />
                                      <span>Location</span>
                                    </button>
                                    
                                    <button
                                      onClick={() => markCompleted(errand.id)}
                                      disabled={completing === errand.id}
                                      className="text-green-600 hover:text-green-700 flex items-center space-x-1 disabled:opacity-50"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>
                                        {completing === errand.id ? 'Marking...' : 'Complete'}
                                      </span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to {Math.min(endIndex, assignedErrands.length)} of {assignedErrands.length} tasks
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  currentPage === pageNum
                                    ? 'bg-primary text-white'
                                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMutualRating && selectedErrand && selectedErrand.poster && (
        <MutualRatingModal
          errand={selectedErrand}
          otherUser={selectedErrand.poster}
          ratingType="runner_to_poster"
          onClose={() => {
            setShowMutualRating(false)
            setSelectedErrand(null)
          }}
          onComplete={() => {
            setShowMutualRating(false)
            setSelectedErrand(null)
            onClose()
          }}
        />
      )}

      {showLocation && selectedErrand && (
        <LocationTracker
          errand={selectedErrand}
          runner={profile!}
          onClose={() => {
            setShowLocation(false)
            setSelectedErrand(null)
          }}
        />
      )}

      {showErrandDetails && selectedErrand && (
        <ErrandDetailsModal
          errand={selectedErrand}
          onClose={() => {
            setShowErrandDetails(false)
            setSelectedErrand(null)
          }}
          onUpdate={() => {
            fetchAssignedErrands()
            setShowErrandDetails(false)
            setSelectedErrand(null)
          }}
        />
      )}
    </>
  )
}