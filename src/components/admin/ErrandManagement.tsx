import React, { useState, useEffect } from 'react'
import { Package, Search, Filter, Eye, Flag, AlertTriangle, CheckCircle, XCircle, Clock, DollarSign, MapPin, Calendar, X } from 'lucide-react'
import { supabase, Errand, Profile } from '../../lib/supabase'

interface ErrandWithDetails extends Errand {
  poster?: Profile
  assigned_runner?: Profile
  bids_count?: number
}

export function ErrandManagement() {
  const [errands, setErrands] = useState<ErrandWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedErrand, setSelectedErrand] = useState<ErrandWithDetails | null>(null)
  const [showErrandDetails, setShowErrandDetails] = useState(false)
  const [flagging, setFlagging] = useState<string | null>(null)

  useEffect(() => {
    fetchErrands()
  }, [])

  const fetchErrands = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('errands')
        .select(`
          *,
          poster:profiles!errands_poster_id_fkey(*),
          assigned_runner:profiles!errands_assigned_runner_id_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get bids count for each errand
      const errandsWithBids = await Promise.all(
        (data || []).map(async (errand) => {
          const { count: bidsCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('errand_id', errand.id)

          return {
            ...errand,
            bids_count: bidsCount || 0
          }
        })
      )

      setErrands(errandsWithBids)
    } catch (error) {
      console.error('Error fetching errands:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFlagErrand = async (errandId: string, flag: boolean) => {
    setFlagging(errandId)
    try {
      const { error } = await supabase
        .from('errands')
        .update({ 
          is_flagged: flag,
          flagged_at: flag ? new Date().toISOString() : null
        })
        .eq('id', errandId)

      if (error) throw error
      
      // Update local state
      setErrands(prev => prev.map(errand => 
        errand.id === errandId 
          ? { ...errand, is_flagged: flag }
          : errand
      ))

      if (selectedErrand?.id === errandId) {
        setSelectedErrand(prev => prev ? { ...prev, is_flagged: flag } : null)
      }
    } catch (error) {
      console.error('Error flagging errand:', error)
      alert('Error updating errand status')
    } finally {
      setFlagging(null)
    }
  }

  const handleDisableErrand = async (errandId: string, disable: boolean) => {
    setFlagging(errandId)
    try {
      const { error } = await supabase
        .from('errands')
        .update({ 
          is_disabled: disable,
          disabled_at: disable ? new Date().toISOString() : null
        })
        .eq('id', errandId)

      if (error) throw error
      
      // Update local state
      setErrands(prev => prev.map(errand => 
        errand.id === errandId 
          ? { ...errand, is_disabled: disable }
          : errand
      ))

      if (selectedErrand?.id === errandId) {
        setSelectedErrand(prev => prev ? { ...prev, is_disabled: disable } : null)
      }
    } catch (error) {
      console.error('Error disabling errand:', error)
      alert('Error updating errand status')
    } finally {
      setFlagging(null)
    }
  }

  const filteredErrands = errands.filter(errand => {
    const matchesSearch = 
      errand.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      errand.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      errand.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      errand.poster?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'open' && errand.status === 'open') ||
      (filterStatus === 'in_progress' && errand.status === 'in_progress') ||
      (filterStatus === 'completed' && errand.status === 'completed') ||
      (filterStatus === 'flagged' && errand.is_flagged) ||
      (filterStatus === 'disabled' && errand.is_disabled)

    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-700'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-700'
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Errand Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage all errands on the platform</p>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search errands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern w-full pl-10"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-modern"
          >
            <option value="all">All Errands</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged</option>
            <option value="disabled">Disabled</option>
          </select>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Found {filteredErrands.length} errands</span>
            </div>
          </div>
        </div>
      </div>

      {/* Errands List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poster
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bids
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredErrands.map((errand) => (
                <tr key={errand.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {errand.title}
                        </div>
                        <div className="text-sm text-gray-500">{errand.location}</div>
                        <div className="text-xs text-gray-400">
                          {formatDate(errand.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{errand.poster?.full_name}</div>
                    <div className="text-sm text-gray-500">{errand.poster?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-success">₵{errand.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(errand.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(errand.status)}`}>
                        {errand.status.replace('_', ' ')}
                      </span>
                      {errand.is_flagged && (
                        <Flag className="w-4 h-4 text-red-500" />
                      )}
                      {errand.is_disabled && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {errand.bids_count} bids
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedErrand(errand)
                          setShowErrandDetails(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {errand.is_flagged ? (
                        <button
                          onClick={() => handleFlagErrand(errand.id, false)}
                          disabled={flagging === errand.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Unflag errand"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFlagErrand(errand.id, true)}
                          disabled={flagging === errand.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Flag errand"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                      {errand.is_disabled ? (
                        <button
                          onClick={() => handleDisableErrand(errand.id, false)}
                          disabled={flagging === errand.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Enable errand"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDisableErrand(errand.id, true)}
                          disabled={flagging === errand.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Disable errand"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Errand Details Modal */}
      {showErrandDetails && selectedErrand && (
        <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Errand Details</h2>
              <button
                onClick={() => setShowErrandDetails(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedErrand.title}</h3>
                  <p className="text-gray-600">{selectedErrand.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedErrand.status)}`}>
                      {selectedErrand.status.replace('_', ' ')}
                    </span>
                    {selectedErrand.is_flagged && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Flagged
                      </span>
                    )}
                    {selectedErrand.is_disabled && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Amount: ₵{selectedErrand.amount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedErrand.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Posted {formatDate(selectedErrand.created_at)}
                    </span>
                  </div>
                  {selectedErrand.deadline && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Due {formatDate(selectedErrand.deadline)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <strong>Poster:</strong> {selectedErrand.poster?.full_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Email:</strong> {selectedErrand.poster?.email}
                  </div>
                  {selectedErrand.assigned_runner && (
                    <div className="text-sm text-gray-600">
                      <strong>Assigned Runner:</strong> {selectedErrand.assigned_runner.full_name}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <strong>Bids:</strong> {selectedErrand.bids_count}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Errand Status</span>
                  <div className="flex items-center space-x-2">
                    {selectedErrand.is_flagged && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Flagged
                      </span>
                    )}
                    {selectedErrand.is_disabled && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {selectedErrand.is_flagged ? (
                    <button
                      onClick={() => {
                        handleFlagErrand(selectedErrand.id, false)
                        setShowErrandDetails(false)
                      }}
                      disabled={flagging === selectedErrand.id}
                      className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Unflag Errand</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleFlagErrand(selectedErrand.id, true)
                        setShowErrandDetails(false)
                      }}
                      disabled={flagging === selectedErrand.id}
                      className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Flag Errand</span>
                    </button>
                  )}
                  
                  {selectedErrand.is_disabled ? (
                    <button
                      onClick={() => {
                        handleDisableErrand(selectedErrand.id, false)
                        setShowErrandDetails(false)
                      }}
                      disabled={flagging === selectedErrand.id}
                      className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Enable Errand</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleDisableErrand(selectedErrand.id, true)
                        setShowErrandDetails(false)
                      }}
                      disabled={flagging === selectedErrand.id}
                      className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Disable Errand</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
