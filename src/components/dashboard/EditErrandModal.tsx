import React, { useState } from 'react'
import { X, MapPin, DollarSign, Calendar, Camera, FileText, Upload, Image as ImageIcon, Edit, Trash2 } from 'lucide-react'
import { supabase, ERRAND_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, Errand } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { GhanaAddressInput } from '../common/GhanaAddressInput'
import { TimePicker } from '../common/TimePicker'

interface EditErrandModalProps {
  errand: Errand
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

export function EditErrandModal({ errand, onClose, onUpdate, onDelete }: EditErrandModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(errand.image_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: errand.title,
    description: errand.description,
    location: errand.location,
    amount: errand.amount.toString(),
    deadlineDate: errand.deadline ? errand.deadline.split('T')[0] : '',
    deadlineTime: errand.deadline ? errand.deadline.split('T')[1] : '',
    notes: errand.notes || '',
    image_url: errand.image_url || '',
    category: errand.category,
    destination_lat: errand.destination_lat || null,
    destination_lng: errand.destination_lng || null
  })

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

    setLoading(true)
    try {
      const { error } = await supabase
        .from('errands')
        .update({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          amount: parseFloat(formData.amount),
          deadline: formData.deadlineDate && formData.deadlineTime ? `${formData.deadlineDate}T${formData.deadlineTime}` : null,
          notes: formData.notes || null,
          image_url: formData.image_url || null,
          category: formData.category,
          destination_lat: formData.destination_lat || null,
          destination_lng: formData.destination_lng || null
        })
        .eq('id', errand.id)
        .eq('poster_id', profile.id) // Security: only poster can edit

      if (error) throw error
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating errand:', error)
      alert('Error updating errand. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `errand-images/${fileName}`

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create a preview URL for the image
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload to Supabase Storage
      setUploadingImage(true)
      const imageUrl = await uploadImage(file)
      setUploadingImage(false)
      
      if (imageUrl) {
        setFormData(prev => ({
          ...prev,
          image_url: imageUrl
        }))
      } else {
        alert('Failed to upload image. Please try again.')
        setImagePreview(errand.image_url || null)
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this errand?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('errands')
        .delete()
        .eq('id', errand.id)
        .eq('poster_id', profile!.id) // Security: only poster can delete

      if (error) throw error
      onDelete()
      onClose()
    } catch (error) {
      console.error('Error deleting errand:', error)
      alert('Error deleting errand. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit errand</h2>
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
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="input-modern w-full"
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
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-modern w-full"
              required
            >
              {ERRAND_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} {category}
                </option>
              ))}
            </select>
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
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="input-modern w-full pl-10"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (optional)
            </label>
            <div className="space-y-2">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <label htmlFor="deadlineDate" className="block text-xs text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="deadlineDate"
                    value={formData.deadlineDate}
                    onChange={handleInputChange}
                    className="input-modern"
                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="deadlineTime" className="block text-xs text-gray-600 mb-1">
                    Time
                  </label>
                  <TimePicker
                    value={formData.deadlineTime}
                    onChange={(time) => setFormData({ ...formData, deadlineTime: time })}
                    placeholder="Select time"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select when you need this errand completed by
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="input-modern w-full resize-none"
              placeholder="Provide detailed instructions for the errand..."
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter pickup/delivery location"
              className="input-modern"
              required
            />
          </div>

          {/* Destination Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="destination_lat" className="block text-sm font-medium text-gray-700">
                Destination latitude (optional)
              </label>
              <input
                type="number"
                id="destination_lat"
                step="any"
                value={formData.destination_lat || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  destination_lat: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="e.g., 5.5600"
                className="input-modern"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="destination_lng" className="block text-sm font-medium text-gray-700">
                Destination longitude (optional)
              </label>
              <input
                type="number"
                id="destination_lng"
                step="any"
                value={formData.destination_lng || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  destination_lng: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="e.g., -0.2057"
                className="input-modern"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image (optional)
            </label>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="input-modern w-full"
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      setFormData({ ...formData, image_url: '' })
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update errand'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete errand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
