import React, { useState, useEffect } from 'react'
import { Users, Search, Filter, Eye, Shield, ShieldOff, Mail, Phone, MapPin, Calendar, Star, UserCheck, UserX, X } from 'lucide-react'
import { supabase, Profile } from '../../lib/supabase'

interface UserWithStats extends Profile {
  errands_count?: number
  bids_count?: number
  total_earned?: number
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [suspending, setSuspending] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        (data || []).map(async (user) => {
          // Get errands count
          const { count: errandsCount } = await supabase
            .from('errands')
            .select('*', { count: 'exact', head: true })
            .eq('poster_id', user.id)

          // Get bids count
          const { count: bidsCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('runner_id', user.id)

          // Get total earned (for runners)
          const { data: completedErrands } = await supabase
            .from('errands')
            .select('amount')
            .eq('assigned_runner_id', user.id)
            .eq('status', 'completed')

          const totalEarned = completedErrands?.reduce((sum, errand) => sum + errand.amount, 0) || 0

          return {
            ...user,
            errands_count: errandsCount || 0,
            bids_count: bidsCount || 0,
            total_earned: totalEarned
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    setSuspending(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null
        })
        .eq('id', userId)

      if (error) throw error
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_suspended: suspend }
          : user
      ))

      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, is_suspended: suspend } : null)
      }
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('Error updating user status')
    } finally {
      setSuspending(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'posters' && user.user_type === 'poster') ||
      (filterType === 'runners' && user.user_type === 'runner') ||
      (filterType === 'suspended' && user.is_suspended) ||
      (filterType === 'active' && !user.is_suspended)

    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage all users and their accounts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="posters">Posters Only</option>
            <option value="runners">Runners Only</option>
            <option value="active">Active Users</option>
            <option value="suspended">Suspended Users</option>
          </select>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Found {filteredUsers.length} users</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
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
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.user_type === 'poster' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.user_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Errands: {user.errands_count}</div>
                      <div>Bids: {user.bids_count}</div>
                      {user.user_type === 'runner' && (
                        <div>Earned: ₵{user.total_earned?.toFixed(2)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-warning fill-current" />
                      <span className="text-sm text-gray-900">
                        {user.average_rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({user.total_ratings || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_suspended 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.is_suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowUserDetails(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {user.is_suspended ? (
                        <button
                          onClick={() => handleSuspendUser(user.id, false)}
                          disabled={suspending === user.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspendUser(user.id, true)}
                          disabled={suspending === user.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4" />
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

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowUserDetails(false)}></div>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.full_name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full mt-2 inline-block ${
                    selectedUser.user_type === 'poster' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedUser.user_type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedUser.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedUser.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Joined {formatDate(selectedUser.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-warning fill-current" />
                    <span className="text-sm text-gray-600">
                      Rating: {selectedUser.average_rating?.toFixed(1) || '0.0'} ({selectedUser.total_ratings || 0} reviews)
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Errands Posted: {selectedUser.errands_count}
                  </div>
                  <div className="text-sm text-gray-600">
                    Bids Placed: {selectedUser.bids_count}
                  </div>
                  {selectedUser.user_type === 'runner' && (
                    <div className="text-sm text-gray-600">
                      Total Earned: ₵{selectedUser.total_earned?.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Account Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedUser.is_suspended 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
                
                <div className="mt-4 flex space-x-3">
                  {selectedUser.is_suspended ? (
                    <button
                      onClick={() => {
                        handleSuspendUser(selectedUser.id, false)
                        setShowUserDetails(false)
                      }}
                      disabled={suspending === selectedUser.id}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center space-x-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Activate Account</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleSuspendUser(selectedUser.id, true)
                        setShowUserDetails(false)
                      }}
                      disabled={suspending === selectedUser.id}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Suspend Account</span>
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
