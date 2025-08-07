import React, { useState } from 'react'
import { X, MapPin, DollarSign, Clock, Calendar, User, Star, CheckCircle, Check, Image as ImageIcon } from 'lucide-react'
import { Errand, supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { MutualRatingModal } from './MutualRatingModal'

interface MyTasksModalProps {
  tasks: Errand[]
  onClose: () => void
  onUpdate: () => void
}

export function MyTasksModal({ tasks, onClose, onUpdate }: MyTasksModalProps) {
  const { profile } = useAuth()
  const [completing, setCompleting] = useState<string | null>(null)
  const [showMutualRating, setShowMutualRating] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Errand | null>(null)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-warning bg-warning'
      case 'completed': return 'text-success bg-success'
      case 'cancelled': return 'text-error bg-error'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const markCompleted = async (taskId: string) => {
    setCompleting(taskId)
    try {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed' })
        .eq('id', taskId)

      if (error) throw error
      
      // Find the task and show rating modal
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setShowMutualRating(true)
      }
    } catch (error) {
      console.error('Error marking as completed:', error)
      alert('Error updating task. Please try again.')
    } finally {
      setCompleting(null)
    }
  }

  const renderImage = (task: Errand) => {
    if (task.image_url && !imageError[task.id]) {
      return (
        <img
          src={task.image_url}
          alt={task.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(prev => ({ ...prev, [task.id]: true }))}
        />
      )
    }
    
    // Default placeholder with location icon
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">No errand image</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                <p className="text-gray-500">Start bidding on errands to see your tasks here</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="card overflow-hidden"
                  >
                    <div className="h-32 bg-gray-100 relative overflow-hidden">
                      {renderImage(task)}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span className="capitalize">{task.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-sm text-gray-500">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span className="font-semibold text-success">₵{task.amount}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{task.location}</span>
                        </div>
                        {task.deadline && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Due {formatDate(task.deadline)}</span>
                          </div>
                        )}
                      </div>

                      {task.poster && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {task.poster.display_username && task.poster.username 
                                  ? task.poster.username 
                                  : task.poster.full_name}
                              </p>
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3 text-warning fill-current" />
                                <span className="text-xs text-gray-500">{task.poster.average_rating?.toFixed(1) || '0.0'}</span>
                                <span className="text-xs text-gray-400">({task.poster.total_ratings || 0} tasks)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mark as Completed Button for in_progress tasks */}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => markCompleted(task.id)}
                          disabled={completing === task.id}
                          className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          <span>{completing === task.id ? 'Marking as Completed...' : 'Mark as Completed'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMutualRating && selectedTask && selectedTask.poster && (
        <MutualRatingModal
          errand={selectedTask}
          otherUser={selectedTask.poster}
          ratingType="runner_to_poster"
          onClose={() => {
            setShowMutualRating(false)
            setSelectedTask(null)
            onUpdate()
            onClose()
          }}
          onComplete={() => {
            setShowMutualRating(false)
            setSelectedTask(null)
            onUpdate()
            onClose()
          }}
        />
      )}
    </>
  )
}