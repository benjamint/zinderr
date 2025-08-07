import React, { useState, useEffect } from 'react'
import { MapPin, DollarSign, Clock, Calendar, Star, Search, Filter } from 'lucide-react'
import { supabase, Errand, ERRAND_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ErrandCard } from './ErrandCard'
import { MyTasksModal } from './MyTasksModal'

export function RunnerDashboard() {
  const { profile } = useAuth()
  const [availableErrands, setAvailableErrands] = useState<Errand[]>([])
  const [myTasks, setMyTasks] = useState<Errand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [filterAmount, setFilterAmount] = useState('')
  const [showMyTasks, setShowMyTasks] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchErrands()
      fetchMyTasks()
    }
  }, [profile])

  const fetchErrands = async () => {
    try {
      const { data, error } = await supabase
        .from('errands')
        .select(`
          *,
          poster:profiles!errands_poster_id_fkey(*)
        `)
        .eq('status', 'open')
        .neq('poster_id', profile!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAvailableErrands(data || [])
    } catch (error) {
      console.error('Error fetching errands:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('errands')
        .select(`
          *,
          poster:profiles!errands_poster_id_fkey(*)
        `)
        .eq('assigned_runner_id', profile!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyTasks(data || [])
    } catch (error) {
      console.error('Error fetching my tasks:', error)
    }
  }

  const filteredErrands = availableErrands.filter(errand => {
    const matchesSearch = errand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         errand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         errand.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || errand.category === selectedCategory
    
    const matchesAmount = !filterAmount || errand.amount >= parseFloat(filterAmount)
    
    return matchesSearch && matchesCategory && matchesAmount
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Errands</h1>
          <p className="text-gray-600 mt-1">Find errands near you and start helping</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMyTasks(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span>My Tasks ({myTasks.length})</span>
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search errands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern w-full pl-10 pr-4"
            />
          </div>
          
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              placeholder="Min amount"
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value)}
              className="input-modern w-full pl-10 pr-4"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Found {filteredErrands.length} errands</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Category</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {ERRAND_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  selectedCategory === category
                    ? `${CATEGORY_COLORS[category]} border-2 border-current`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span>{category}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredErrands.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No errands available</h3>
          <p className="text-gray-500">
            {selectedCategory !== 'All' 
              ? `No ${selectedCategory} errands found. Try changing your filters.`
              : 'Check back later for new opportunities to help neighbors'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredErrands.map((errand) => (
            <ErrandCard
              key={errand.id}
              errand={errand}
              onUpdate={() => {
                fetchErrands()
                fetchMyTasks()
              }}
            />
          ))}
        </div>
      )}

      {showMyTasks && (
        <MyTasksModal
          tasks={myTasks}
          onClose={() => setShowMyTasks(false)}
          onUpdate={() => {
            fetchMyTasks()
            fetchErrands()
          }}
        />
      )}
    </div>
  )
}