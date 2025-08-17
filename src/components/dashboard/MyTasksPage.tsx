import React, { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, MapPin, Eye, Calendar, CheckCircle, Navigation } from 'lucide-react'
import { supabase, Errand, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ErrandDetailsModal } from './ErrandDetailsModal'

interface MyTasksPageProps {
  onClose: () => void
}

export function MyTasksPage({ onClose }: MyTasksPageProps) {
  const { profile } = useAuth()
  const [assignedErrands, setAssignedErrands] = useState<Errand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null)
  const [showErrandDetails, setShowErrandDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assigned tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onClose}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to dashboard</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">My assigned tasks</h1>
              </div>
              
              <div className="text-sm text-gray-500">
                {assignedErrands.length} total tasks
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {assignedErrands.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No assigned tasks</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                You haven't been assigned any errands yet. When posters accept your bids, 
                they will appear here for you to manage.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Navigation className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">In progress</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {assignedErrands.filter(e => e.status === 'in_progress').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {assignedErrands.filter(e => e.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total tasks</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {assignedErrands.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
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
                            <button
                              onClick={() => {
                                setSelectedErrand(errand)
                                setShowErrandDetails(true)
                              }}
                              className="text-primary hover:text-primary-dark flex items-center space-x-2 hover:bg-primary hover:text-white px-3 py-2 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View details</span>
                            </button>
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

      {/* Errand Details Modal */}
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
