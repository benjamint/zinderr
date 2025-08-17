import React, { useState, useRef } from 'react'
import { Camera, X, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string
  userId: string
  onUploadSuccess: (url: string) => void
  onUploadError: (error: string) => void
}

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  userId, 
  onUploadSuccess, 
  onUploadError 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        onUploadError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onUploadError('Image size must be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadProfilePicture = async (file: File) => {
    try {
      setUploading(true)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `profile-${userId}-${Date.now()}.${fileExt}`
      const filePath = `profile-pictures/${userId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('errands')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('errands')
        .getPublicUrl(filePath)

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      onUploadSuccess(publicUrl)
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      onUploadError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      await uploadProfilePicture(file)
    }
  }

  const removeProfilePicture = async () => {
    try {
      setUploading(true)

      // Remove from database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) throw updateError

      setPreviewUrl(null)
      onUploadSuccess('')
    } catch (error) {
      console.error('Error removing profile picture:', error)
      onUploadError('Failed to remove profile picture. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Profile Picture */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
              <button
                onClick={removeProfilePicture}
                disabled={uploading}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Remove profile picture"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-500">
            Upload a clear photo of yourself. Max size: 5MB
          </p>
        </div>
      </div>

      {/* Upload Controls */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Choose Photo</span>
          </button>

          {previewUrl && previewUrl !== currentAvatarUrl && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>

        {uploading && (
          <div className="text-sm text-gray-600">
            Uploading profile picture...
          </div>
        )}
      </div>
    </div>
  )
}
