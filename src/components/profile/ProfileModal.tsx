import React, { useState } from 'react'
import { X, User, Eye, EyeOff, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { GhanaAddressInput } from '../common/GhanaAddressInput'
import { ProfilePictureUpload } from './ProfilePictureUpload'

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    display_username: profile?.display_username || false
  })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleProfilePictureSuccess = (url: string) => {
    setSuccessMessage('Profile picture updated successfully!')
    // Update the profile context if needed
    if (profile) {
      profile.avatar_url = url
    }
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleProfilePictureError = (error: string) => {
    setError(error)
    setTimeout(() => setError(''), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.trim() || null,
          phone: formData.phone.trim() || null,
          location: formData.location.trim() || null,
          display_username: formData.display_username
        })
        .eq('id', profile.id)

      if (error) {
        if (error.code === '23505') {
          setError('Username is already taken. Please choose another.')
        } else {
          throw error
        }
      } else {
        window.location.reload() // Refresh to update profile data
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Profile settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Upload */}
          <div>
            <ProfilePictureUpload
              currentAvatarUrl={profile?.avatar_url}
              userId={profile?.id || ''}
              onUploadSuccess={handleProfilePictureSuccess}
              onUploadError={handleProfilePictureError}
            />
            {successMessage && (
              <p className="mt-2 text-sm text-green-600">{successMessage}</p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full name *
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input-modern"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-modern"
              placeholder="+233 XX XXX XXXX"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-modern"
              required
              placeholder="City, Region"
            />
          </div>

          {/* Username Settings */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={formData.username || ''}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-modern"
              placeholder="Choose a unique username"
            />
            <div className="mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.display_username}
                  onChange={(e) => setFormData({ ...formData, display_username: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">Display username on profile</span>
              </label>
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
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}