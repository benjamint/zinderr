import React, { useState } from 'react'
import { Camera, Upload, Phone, User, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

interface RunnerVerificationFormProps {
  onBack: () => void
  onComplete: (verificationData: {
    ghanaCardFront: File | null
    ghanaCardBack: File | null
    phoneNumber: string
    selfie: File | null
  }) => void
  loading: boolean
}

export function RunnerVerificationForm({ onBack, onComplete, loading }: RunnerVerificationFormProps) {
  const [step, setStep] = useState(1)
  const [verificationData, setVerificationData] = useState({
    ghanaCardFront: null as File | null,
    ghanaCardBack: null as File | null,
    phoneNumber: '',
    selfie: null as File | null
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileUpload = (field: 'ghanaCardFront' | 'ghanaCardBack' | 'selfie', file: File) => {
    setVerificationData(prev => ({ ...prev, [field]: file }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!verificationData.ghanaCardFront) {
        newErrors.ghanaCardFront = 'Ghana Card front image is required'
      }
      if (!verificationData.ghanaCardBack) {
        newErrors.ghanaCardBack = 'Ghana Card back image is required'
      }
    } else if (stepNumber === 2) {
      if (!verificationData.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required'
      } else if (!/^(\+233|0)[2-9]\d{8}$/.test(verificationData.phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid Ghana phone number'
      }
    } else if (stepNumber === 3) {
      if (!verificationData.selfie) {
        newErrors.selfie = 'Live selfie is required for verification'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 3) {
        setStep(step + 1)
      } else {
        onComplete(verificationData)
      }
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      onBack()
    }
  }

  const FileUploadBox = ({ 
    field, 
    title, 
    description, 
    accept = "image/*" 
  }: { 
    field: 'ghanaCardFront' | 'ghanaCardBack' | 'selfie'
    title: string
    description: string
    accept?: string
  }) => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(field, file)
        }}
        className="hidden"
        id={field}
      />
      <label htmlFor={field} className="cursor-pointer">
        <div className="flex flex-col items-center space-y-3">
          {verificationData[field] ? (
            <CheckCircle className="w-12 h-12 text-green-500" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-500">{description}</p>
            {verificationData[field] && (
              <p className="text-sm text-green-600 mt-1">✓ {verificationData[field].name}</p>
            )}
          </div>
        </div>
      </label>
      {errors[field] && (
        <p className="text-red-500 text-sm mt-2 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors[field]}
        </p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
              <p className="text-blue-100 mt-1">Step {step} of 3 - Secure your runner account</p>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= step ? 'bg-white' : 'bg-white bg-opacity-30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Ghana Card</h2>
                <p className="text-gray-600">Please upload clear photos of both sides of your Ghana Card</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadBox
                  field="ghanaCardFront"
                  title="Front Side"
                  description="Upload front of Ghana Card"
                />
                <FileUploadBox
                  field="ghanaCardBack"
                  title="Back Side"
                  description="Upload back of Ghana Card"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure all text is clearly visible</li>
                      <li>Photos should be well-lit and in focus</li>
                      <li>Your information will be kept secure and confidential</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Phone Verification</h2>
                <p className="text-gray-600">Enter your phone number for account security</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={verificationData.phoneNumber}
                    onChange={(e) => {
                      setVerificationData(prev => ({ ...prev, phoneNumber: e.target.value }))
                      setErrors(prev => ({ ...prev, phoneNumber: '' }))
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+233 XX XXX XXXX or 0XX XXX XXXX"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Why we need your phone number:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Direct communication with errand posters</li>
                      <li>SMS notifications for new opportunities</li>
                      <li>Account security and verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Live Selfie Verification</h2>
                <p className="text-gray-600">Take a clear selfie to complete your verification</p>
              </div>

              <FileUploadBox
                field="selfie"
                title="Take Live Selfie"
                description="Upload a clear photo of yourself"
                accept="image/*"
              />

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Camera className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium mb-1">Selfie Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Look directly at the camera</li>
                      <li>Ensure good lighting on your face</li>
                      <li>Remove sunglasses or hats</li>
                      <li>Match the photo on your Ghana Card</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handlePrevious}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 1 ? 'Back to Signup' : 'Previous'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>
                {loading ? 'Creating Account...' : step === 3 ? 'Complete Verification' : 'Next'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}