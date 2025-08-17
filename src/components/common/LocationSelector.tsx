import React, { useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'

interface LocationSelectorProps {
  value: string
  onChange: (location: string) => void
  placeholder?: string
  required?: boolean
}

const SUGGESTED_LOCATIONS = [
  'Accra Mall',
  'West Hills Mall',
  'Achimota Mall',
  'Circle Market',
  'Kaneshie Market',
  'Makola Market',
  'Tema Harbour',
  'Kotoka International Airport',
  'University of Ghana',
  'Korle Bu Teaching Hospital',
  'Ridge Hospital',
  '37 Military Hospital',
  'East Legon',
  'Cantonments',
  'Osu',
  'Labone',
  'Adabraka',
  'Kaneshie',
  'Achimota',
  'Tema'
]

export function LocationSelector({ value, onChange, placeholder = "Select or type location", required = false }: LocationSelectorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLocations = SUGGESTED_LOCATIONS.filter(location =>
    location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLocationSelect = (location: string) => {
    onChange(location)
    setShowSuggestions(false)
    setSearchTerm('')
  }

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)
    setSearchTerm(inputValue)
    setShowSuggestions(true)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200)
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="input-modern pl-10 pr-10 w-full"
          required={required}
        />
        {value && (
          <button
            onClick={() => {
              onChange('')
              setSearchTerm('')
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Location Suggestions */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="py-2">
            {filteredLocations.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No locations found. Type your own location above.
              </div>
            ) : (
              filteredLocations.map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{location}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
