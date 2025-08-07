import React, { useState } from 'react'
import { X, MapPin, DollarSign, Calendar, Camera, FileText, Upload, Image as ImageIcon, Edit, Trash2 } from 'lucide-react'
import { supabase, ERRAND_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, Errand } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { GhanaAddressInput } from '../common/GhanaAddressInput'

interface EditErrandModalProps {
  errand: Errand
  onClose: () => void
  onUpdate: () => void
}

export function EditErrandModal({ errand, onClose, onUpdate }: EditErrandModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(errand.image_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: errand.title,
    description: errand.description,
    location: errand.location,
    amount: errand.amount.toString(),
    deadline: errand.deadline || '',
    notes: errand.notes || '',
    image_url: errand.image_url || '',
    category: errand.category
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('errands')
        .update({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          amount: parseFloat(formData.amount),
          deadline: formData.deadline || null,
          notes: formData.notes || null,
          image_url: formData.image_url || null,
          category: formData.category
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
      onUpdate()
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
          <h2 className="text-xl font-bold text-gray-900">Edit Errand</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="input-modern w-full"
                placeholder="What do you need help with?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="input-modern w-full"
              >
                {ERRAND_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_ICONS[category]} {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₵) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="1"
                step="0.01"
                className="input-modern w-full"
                placeholder="How much are you willing to pay?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                className="input-modern w-full"
              />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <GhanaAddressInput
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              placeholder="Where should this errand be completed?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image (Optional)
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
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2 text-error hover:text-error"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Errand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
