import React, { useState } from 'react'
import { X, Upload, MapPin, DollarSign, Clock, Calendar, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CATEGORY_ICONS, CATEGORY_COLORS, ERRAND_CATEGORIES } from '../../lib/supabase'
import { LocationSelector } from '../common/LocationSelector'
import { TimePicker } from '../common/TimePicker'

interface PostErrandModalProps {
  onClose: () => void
  onUpdate: () => void
}

export function PostErrandModal({ onClose, onUpdate }: PostErrandModalProps) {
  const { profile } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    amount: '',
    deadlineDate: '',
    deadlineTime: '',
    image_url: '',
    category: 'Others',
    destination_lat: null as number | null,
    destination_lng: null as number | null
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('errands')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('errands')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    // Validate deadline is in the future
    if (formData.deadlineDate && formData.deadlineTime) {
      const deadlineDateTime = new Date(`${formData.deadlineDate}T${formData.deadlineTime}`)
      const now = new Date()
      
      if (deadlineDateTime <= now) {
        alert('Deadline must be in the future. Please select a future date and time.')
        return
      }
    }

    try {
      setSubmitting(true)

      let imageUrl = formData.image_url
      if (imagePreview && imagePreview !== formData.image_url) {
        // Convert base64 to file and upload
        const response = await fetch(imagePreview)
        const blob = await response.blob()
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
        imageUrl = await uploadImage(file) || ''
      }

      const { error } = await supabase
        .from('errands')
        .insert([{
          poster_id: profile.id,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          amount: parseFloat(formData.amount),
          deadline: formData.deadlineDate && formData.deadlineTime ? `${formData.deadlineDate}T${formData.deadlineTime}` : null,
          notes: null, // Removed notes field
          image_url: imageUrl || null,
          category: formData.category,
          destination_lat: formData.destination_lat || null,
          destination_lng: formData.destination_lng || null
        }])

      if (error) throw error

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error creating errand:', error)
      alert('Error creating errand. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Post new errand</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Errand title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What do you need help with?"
              className="input-modern"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-modern"
              required
            >
              {ERRAND_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} {category}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about what you need..."
              className="input-modern"
              rows={3}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <LocationSelector
              value={formData.location}
              onChange={(location) => setFormData({ ...formData, location })}
              placeholder="Select or type pickup/delivery location"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Budget amount (₵) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="input-modern pl-10"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline *
            </label>
            <div className="space-y-2">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <label htmlFor="deadlineDate" className="block text-xs text-gray-600 mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      id="deadlineDate"
                      value={formData.deadlineDate}
                      onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                      className="input-modern pl-10"
                      required
                      min={new Date().toISOString().split('T')[0]} // Prevent past dates
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="deadlineTime" className="block text-xs text-gray-600 mb-1">
                    Time
                  </label>
                  <TimePicker
                    value={formData.deadlineTime}
                    onChange={(time) => setFormData({ ...formData, deadlineTime: time })}
                    placeholder="Select time"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select when you need this errand completed by
              </p>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
              Image (optional)
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload image</p>
                    </div>
                  )}
                </label>
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    setFormData({ ...formData, image_url: '' })
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post errand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}