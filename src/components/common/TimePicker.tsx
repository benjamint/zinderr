import React, { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

// Pre-defined time options for quick selection
const TIME_OPTIONS = [
  // Morning (6 AM - 11 AM)
  { label: '6:00 AM', value: '06:00' },
  { label: '6:30 AM', value: '06:30' },
  { label: '7:00 AM', value: '07:00' },
  { label: '7:30 AM', value: '07:30' },
  { label: '8:00 AM', value: '08:00' },
  { label: '8:30 AM', value: '08:30' },
  { label: '9:00 AM', value: '09:00' },
  { label: '9:30 AM', value: '09:30' },
  { label: '10:00 AM', value: '10:00' },
  { label: '10:30 AM', value: '10:30' },
  { label: '11:00 AM', value: '11:00' },
  { label: '11:30 AM', value: '11:30' },
  
  // Afternoon (12 PM - 5 PM)
  { label: '12:00 PM', value: '12:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '1:00 PM', value: '13:00' },
  { label: '1:30 PM', value: '13:30' },
  { label: '2:00 PM', value: '14:00' },
  { label: '2:30 PM', value: '14:30' },
  { label: '3:00 PM', value: '15:00' },
  { label: '3:30 PM', value: '15:30' },
  { label: '4:00 PM', value: '16:00' },
  { label: '4:30 PM', value: '16:30' },
  { label: '5:00 PM', value: '17:00' },
  { label: '5:30 PM', value: '17:30' },
  
  // Evening (6 PM - 11 PM)
  { label: '6:00 PM', value: '18:00' },
  { label: '6:30 PM', value: '18:30' },
  { label: '7:00 PM', value: '19:00' },
  { label: '7:30 PM', value: '19:30' },
  { label: '8:00 PM', value: '20:00' },
  { label: '8:30 PM', value: '20:30' },
  { label: '9:00 PM', value: '21:00' },
  { label: '9:30 PM', value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
  { label: '10:30 PM', value: '22:30' },
  { label: '11:00 PM', value: '23:00' },
  { label: '11:30 PM', value: '23:30' },
  
  // Late Night (12 AM - 5 AM)
  { label: '12:00 AM', value: '00:00' },
  { label: '12:30 AM', value: '00:30' },
  { label: '1:00 AM', value: '01:00' },
  { label: '1:30 AM', value: '01:30' },
  { label: '2:00 AM', value: '02:00' },
  { label: '2:30 AM', value: '02:30' },
  { label: '3:00 AM', value: '03:00' },
  { label: '3:30 AM', value: '03:30' },
  { label: '4:00 AM', value: '04:00' },
  { label: '4:30 AM', value: '04:30' },
  { label: '5:00 AM', value: '05:00' },
  { label: '5:30 AM', value: '05:30' },
]

export function TimePicker({ value, onChange, placeholder = "Select time", required = false, className = "" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter time options based on search term
  const filteredOptions = TIME_OPTIONS.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get display value (convert 24h to 12h format)
  const getDisplayValue = (timeValue: string) => {
    if (!timeValue) return ''
    
    const [hours, minutes] = timeValue.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Handle time selection
  const handleTimeSelect = (timeValue: string) => {
    onChange(timeValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  // Handle manual time input
  const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)
  }

  // Group time options by period for better organization
  const groupedOptions = {
    'Morning (6 AM - 11 AM)': TIME_OPTIONS.filter(opt => opt.value >= '06:00' && opt.value <= '11:30'),
    'Afternoon (12 PM - 5 PM)': TIME_OPTIONS.filter(opt => opt.value >= '12:00' && opt.value <= '17:30'),
    'Evening (6 PM - 11 PM)': TIME_OPTIONS.filter(opt => opt.value >= '18:00' && opt.value <= '23:30'),
    'Late Night (12 AM - 5 AM)': TIME_OPTIONS.filter(opt => opt.value >= '00:00' && opt.value <= '05:30')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Time Input */}
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={getDisplayValue(value)}
          onChange={handleManualTimeChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input-modern pl-10 pr-10 w-full cursor-pointer"
          required={required}
          readOnly
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search time..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Time Options */}
          <div className="max-h-64 overflow-y-auto">
            {searchTerm ? (
              // Show filtered results when searching
              <div className="py-2">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No times found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTimeSelect(option.value)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {value === option.value && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Show grouped options when not searching
              Object.entries(groupedOptions).map(([period, options]) => (
                <div key={period}>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                    {period}
                  </div>
                  {options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTimeSelect(option.value)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {value === option.value && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <button
                onClick={() => handleTimeSelect('09:00')}
                className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors"
              >
                9:00 am
              </button>
              <button
                onClick={() => handleTimeSelect('12:00')}
                className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors"
              >
                12:00 pm
              </button>
              <button
                onClick={() => handleTimeSelect('17:00')}
                className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors"
              >
                5:00 pm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
