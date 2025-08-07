import React, { useState, useEffect } from 'react'
import { MapPin, Search } from 'lucide-react'

interface GhanaAddressInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

// Ghana regions and major cities/areas
const ghanaLocations = [
  // Greater Accra Region
  'Accra Central, Greater Accra',
  'Adabraka, Greater Accra',
  'Airport Residential Area, Greater Accra',
  'Asylum Down, Greater Accra',
  'Cantonments, Greater Accra',
  'Dansoman, Greater Accra',
  'East Legon, Greater Accra',
  'Labone, Greater Accra',
  'Madina, Greater Accra',
  'North Kaneshie, Greater Accra',
  'Osu, Greater Accra',
  'Ridge, Greater Accra',
  'Spintex, Greater Accra',
  'Tema, Greater Accra',
  'Tesano, Greater Accra',
  'Teshie, Greater Accra',
  'West Legon, Greater Accra',
  
  // Ashanti Region
  'Kumasi Central, Ashanti',
  'Adum, Kumasi, Ashanti',
  'Asokwa, Kumasi, Ashanti',
  'Bantama, Kumasi, Ashanti',
  'Nhyiaeso, Kumasi, Ashanti',
  'Oforikrom, Kumasi, Ashanti',
  'Suame, Kumasi, Ashanti',
  'Tafo, Kumasi, Ashanti',
  
  // Western Region
  'Sekondi-Takoradi, Western',
  'Tarkwa, Western',
  'Axim, Western',
  'Half Assini, Western',
  
  // Central Region
  'Cape Coast, Central',
  'Elmina, Central',
  'Kasoa, Central',
  'Winneba, Central',
  
  // Eastern Region
  'Koforidua, Eastern',
  'Akosombo, Eastern',
  'Begoro, Eastern',
  'Nkawkaw, Eastern',
  
  // Northern Region
  'Tamale, Northern',
  'Yendi, Northern',
  'Bimbilla, Northern',
  
  // Upper East Region
  'Bolgatanga, Upper East',
  'Bawku, Upper East',
  'Navrongo, Upper East',
  
  // Upper West Region
  'Wa, Upper West',
  'Lawra, Upper West',
  
  // Volta Region
  'Ho, Volta',
  'Hohoe, Volta',
  'Keta, Volta',
  'Aflao, Volta',
  
  // Brong Ahafo Region
  'Sunyani, Brong Ahafo',
  'Techiman, Brong Ahafo',
  'Berekum, Brong Ahafo'
]

export function GhanaAddressInput({ 
  value, 
  onChange, 
  placeholder = "Enter location in Ghana", 
  required = false,
  className = ""
}: GhanaAddressInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])

  useEffect(() => {
    if (value.length > 0) {
      const filtered = ghanaLocations.filter(location =>
        location.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredLocations(filtered.slice(0, 8)) // Show max 8 suggestions
    } else {
      setFilteredLocations([])
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(newValue.length > 0)
  }

  const handleSelectLocation = (location: string) => {
    onChange(location)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (value.length > 0) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Delay closing to allow for selection
    setTimeout(() => setIsOpen(false), 200)
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          required={required}
          className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
          placeholder={placeholder}
        />
      </div>
      
      {isOpen && filteredLocations.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.map((location, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectLocation(location)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-900">{location}</span>
            </button>
          ))}
          
          {filteredLocations.length === 0 && value.length > 0 && (
            <div className="px-4 py-3 text-gray-500 text-sm flex items-center space-x-3">
              <Search className="w-4 h-4" />
              <span>No locations found. You can still enter your custom address.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}