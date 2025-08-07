import React, { useState, useEffect } from 'react'
import { X, Clock, CheckCircle, Star, MapPin, DollarSign, Calendar } from 'lucide-react'
import { supabase, Transaction, Errand } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface HistoryModalProps {
  userType: 'poster' | 'runner'
  onClose: () => void
}

export function HistoryModal({ userType, onClose }: HistoryModalProps) {
  const { profile } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [errands, setErrands] = useState<Errand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'completed' | 'all'>('completed')

  useEffect(() => {
    if (profile) {
      fetchHistory()
    }
  }, [profile, userType])

  const fetchHistory = async () => {
    try {
      if (userType === 'runner') {
        // Fetch completed transactions for runners
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select(`
            *,
            errand:errands(*, poster:profiles!errands_poster_id_fkey(*))
          `)
          .eq('runner_id', profile!.id)
          .order('completed_at', { ascending: false })

        if (transactionError) throw transactionError
        setTransactions(transactionData || [])

        // Fetch all errands runner has worked on
        const { data: errandData, error: errandError } = await supabase
          .from('errands')
          .select(`
            *,
            poster:profiles!errands_poster_id_fkey(*)
          `)
          .eq('assigned_runner_id', profile!.id)
          .order('updated_at', { ascending: false })

        if (errandError) throw errandError
        setErrands(errandData || [])
      } else {
        // Fetch errands posted by poster
        const { data: errandData, error: errandError } = await supabase
          .from('errands')
          .select(`
            *,
            assigned_runner:profiles!errands_assigned_runner_id_fkey(*)
          `)
          .eq('poster_id', profile!.id)
          .order('updated_at', { ascending: false })

        if (errandError) throw errandError
        setErrands(errandData || [])

        // Fetch completed transactions for posters
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select(`
            *,
            errand:errands(*),
            runner:profiles!transactions_runner_id_fkey(*)
          `)
          .eq('poster_id', profile!.id)
          .order('completed_at', { ascending: false })

        if (transactionError) throw transactionError
        setTransactions(transactionData || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-gray-700 bg-gray-100'
      case 'in_progress': return 'text-yellow-700 bg-yellow-100'
      case 'completed': return 'text-green-700 bg-green-100'
      case 'cancelled': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const completedErrands = errands.filter(e => e.status === 'completed')
  const displayData = activeTab === 'completed' ? completedErrands : errands

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {userType === 'runner' ? 'My Task History' : 'My Errand History'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex mb-6">
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-all ${
                activeTab === 'completed'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed ({completedErrands.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All History ({errands.length})
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-700">{completedErrands.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-blue-600">
                    {userType === 'runner' ? 'Total Earned' : 'Total Spent'}
                  </p>
                  <p className="text-xl font-bold text-blue-700">
                    ₵{transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-yellow-600">Average Rating</p>
                  <p className="text-xl font-bold text-yellow-700">{profile?.rating.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* History List */}
          {displayData.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
              <p className="text-gray-500">
                {userType === 'runner' 
                  ? 'Start bidding on errands to build your history'
                  : 'Post your first errand to get started'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayData.map((errand) => (
                <div
                  key={errand.id}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">{errand.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{errand.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(errand.status)}`}>
                        {getStatusIcon(errand.status)}
                        <span className="capitalize">{errand.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span className="font-semibold text-green-600">₵{errand.amount}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{errand.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formatDate(errand.created_at)}</span>
                    </div>
                  </div>

                  {/* Show partner info */}
                  {userType === 'runner' && errand.poster && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">Errand posted by:</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{errand.poster.full_name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {errand.poster.display_username && errand.poster.username 
                            ? errand.poster.username 
                            : errand.poster.full_name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-500">{errand.poster.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {userType === 'poster' && errand.assigned_runner && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">Completed by:</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{errand.assigned_runner.full_name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {errand.assigned_runner.display_username && errand.assigned_runner.username 
                            ? errand.assigned_runner.username 
                            : errand.assigned_runner.full_name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-500">{errand.assigned_runner.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}