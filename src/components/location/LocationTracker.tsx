import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Clock, User, Phone, MessageCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Errand, Profile } from '../../lib/supabase'

interface LocationUpdate {
  id: string
  user_id: string
  errand_id: string
  latitude: number
  longitude: number
  accuracy: number
  location_timestamp: string
  user?: Profile
}

interface LocationTrackerProps {
  errand: Errand
  runner: Profile
  onClose: () => void
}

export function LocationTracker({ errand, runner, onClose }: LocationTrackerProps) {
  const { profile } = useAuth()
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null)
  const [locationHistory, setLocationHistory] = useState<LocationUpdate[]>([])
  const [tracking, setTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    fetchLocationHistory()
    const channel = supabase
      .channel(`location:${errand.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_updates',
          filter: `errand_id=eq.${errand.id}`
        },
        (payload) => {
          const newLocation = payload.new as LocationUpdate
          setLocationHistory(prev => [...prev, newLocation])
          if (newLocation.user_id === runner.id) {
            setCurrentLocation(newLocation)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [errand.id, runner.id])

  const fetchLocationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('location_updates')
        .select(`
          *,
          user:profiles!location_updates_user_id_fkey(*)
        `)
        .eq('errand_id', errand.id)
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) throw error
      setLocationHistory(data || [])
      
      // Set current location to latest
      if (data && data.length > 0) {
        setCurrentLocation(data[0])
      }
    } catch (error) {
      console.error('Error fetching location history:', error)
    }
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setTracking(true)
    setError(null)

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        updateLocation(latitude, longitude, accuracy)
      },
      (error) => {
        setError(`Location error: ${error.message}`)
        setTracking(false)
      },
      options
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTracking(false)
  }

  const updateLocation = async (latitude: number, longitude: number, accuracy: number) => {
    try {
      const { error } = await supabase
        .from('location_updates')
        .insert({
          user_id: profile!.id,
          errand_id: errand.id,
          latitude,
          longitude,
          accuracy,
          location_timestamp: new Date().toISOString()
        })

      if (error) throw error

      // Calculate estimated time if we have destination coordinates
      if (errand.destination_lat && errand.destination_lng) {
        calculateEstimatedTime(latitude, longitude, errand.destination_lat, errand.destination_lng)
      }
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  const calculateEstimatedTime = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Simple distance calculation (Haversine formula)
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // Estimate time (assuming average speed of 20 km/h for urban areas)
    const estimatedHours = distance / 20
    const estimatedMinutes = Math.round(estimatedHours * 60)
    
    if (estimatedMinutes < 60) {
      setEstimatedTime(`${estimatedMinutes} minutes`)
    } else {
      const hours = Math.floor(estimatedMinutes / 60)
      const minutes = estimatedMinutes % 60
      setEstimatedTime(`${hours}h ${minutes}m`)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isRunner = profile?.id === runner.id

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Location Tracking</h3>
              <p className="text-sm text-gray-500">
                {isRunner ? 'Your location' : `${runner.full_name}'s location`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Controls */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isRunner && (
                <button
                  onClick={tracking ? stopTracking : startTracking}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    tracking
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {tracking ? 'Stop Tracking' : 'Start Tracking'}
                </button>
              )}
              {estimatedTime && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>ETA: {estimatedTime}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>Live Updates</span>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Map Placeholder */}
        <div className="flex-1 p-4">
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">Map Integration</p>
              <p className="text-sm">Connect to Google Maps or Mapbox API</p>
              {currentLocation && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium">Current Location:</p>
                  <p className="text-xs text-gray-600">
                    Lat: {currentLocation.latitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Lng: {currentLocation.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Accuracy: {currentLocation.accuracy.toFixed(1)}m
                  </p>
                  <p className="text-xs text-gray-600">
                    Updated: {formatTime(currentLocation.location_timestamp)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location History */}
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Location History</h4>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {locationHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No location updates yet
              </p>
            ) : (
              locationHistory.slice(0, 10).map((update) => (
                <div
                  key={update.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {update.user?.full_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <span>
                      {update.latitude.toFixed(4)}, {update.longitude.toFixed(4)}
                    </span>
                    <span>•</span>
                    <span>{formatTime(update.location_timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
