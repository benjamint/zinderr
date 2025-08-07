import React, { useState } from 'react'
import { MapPin, User, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { RunnerVerificationForm } from './RunnerVerificationForm'
import { GhanaAddressInput } from '../common/GhanaAddressInput'

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    user_type: 'poster' as 'poster' | 'runner',
    location: '',
    phone: ''
  })

  const { signIn, signUp } = useAuth()

  const handleRunnerSignup = async (verificationData: any) => {
    setLoading(true)
    setError('')

    try {
      // For now, we'll store the verification data in the profile
      // In production, you'd upload files to storage and process verification
      const result = await signUp(formData.email, formData.password, {
        full_name: formData.full_name,
        user_type: formData.user_type,
        location: formData.location,
        phone: verificationData.phoneNumber
      })

      if (result.error) {
        setError(result.error)
        setShowVerification(false)
      }
    } catch (error) {
      setError('An unexpected error occurred')
      setShowVerification(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If signing up as runner, show verification form
    if (isSignUp && formData.user_type === 'runner') {
      setShowVerification(true)
      return
    }
    
    setLoading(true)
    setError('')

    try {
      let result
      if (isSignUp) {
        result = await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          user_type: formData.user_type,
          location: formData.location,
          phone: formData.phone
        })
      } else {
        result = await signIn(formData.email, formData.password)
      }

      if (result.error) {
        setError(result.error)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (showVerification) {
    return (
      <RunnerVerificationForm
        onBack={() => setShowVerification(false)}
        onComplete={handleRunnerSignup}
        loading={loading}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modern-lg w-full max-w-md overflow-hidden">
        <div className="bg-primary px-8 py-8 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Zinderr</h1>
          <p className="text-white text-opacity-90 mt-1">Ghana's Trusted Errand Platform</p>
        </div>

        <div className="p-8">
          <div className="flex mb-6 bg-gray-50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-md transition-all ${
                !isSignUp
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-md transition-all ${
                isSignUp
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error text-white px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required={isSignUp}
                      className="input-modern pl-10 pr-4"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    I want to
                  </label>
                  <select
                    name="user_type"
                    value={formData.user_type}
                    onChange={handleInputChange}
                    className="input-modern"
                  >
                    <option value="poster">I need help with errands</option>
                    <option value="runner">I want to help with errands (requires verification)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <GhanaAddressInput
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                    placeholder="Your neighborhood or area in Ghana"
                    required={isSignUp}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="input-modern pl-10 pr-4"
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="input-modern pl-10 pr-4"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="input-modern pl-10 pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}