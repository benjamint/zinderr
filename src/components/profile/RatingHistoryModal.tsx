import React, { useState, useEffect } from 'react'
import { X, Star, Calendar, User } from 'lucide-react'
import { supabase, Profile } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface RatingHistoryModalProps {
  onClose: () => void
}

export function RatingHistoryModal({ onClose }: RatingHistoryModalProps) {
  const { profile } = useAuth()
  const [ratings, setRatings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchRatings()
    }
  }, [profile])

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('mutual_ratings')
        .select(`
          *,
          rater:profiles!mutual_ratings_rater_id_fkey(*),
          errand:errands(*)
        `)
        .eq('rated_id', profile!.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRatings(data || [])
    } catch (error) {
      console.error('Error fetching ratings:', error)
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Rating History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {ratings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No ratings yet</h3>
              <p className="text-gray-500">Complete more errands to receive ratings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {rating.rater.display_username && rating.rater.username 
                            ? rating.rater.username 
                            : rating.rater.full_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {rating.rating_type === 'poster_to_runner' ? 'Rated as Runner' : 'Rated as Poster'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{rating.rating}</span>
                    </div>
                  </div>
                  
                  {rating.comment && (
                    <p className="text-gray-700 mb-3">"{rating.comment}"</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{rating.errand?.title}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(rating.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
