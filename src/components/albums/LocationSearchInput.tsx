'use client'

import { MapPin } from 'lucide-react'
import { LocationDropdown } from '@/components/location/LocationDropdown'
import { type LocationData } from '@/lib/utils/locationUtils'
import { Label } from '@/components/ui/label'

interface LocationSearchInputProps {
  value: LocationData | null
  onChange: (value: LocationData | null) => void
  placeholder?: string
  label?: string
  required?: boolean
  showAutoFillButton?: boolean
  onAutoFill?: () => void
  isAutoFilling?: boolean
}

export function LocationSearchInput({
  value,
  onChange,
  placeholder = "Search for a city or country",
  label = "Location",
  required = false,
  showAutoFillButton = false,
  onAutoFill,
  isAutoFilling = false
}: LocationSearchInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {showAutoFillButton && onAutoFill && (
          <button
            type="button"
            onClick={onAutoFill}
            disabled={isAutoFilling}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors disabled:opacity-50"
          >
            {isAutoFilling ? 'Extracting...' : 'Auto-fill from Photos'}
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>

        <div className="pl-10">
          <LocationDropdown
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            allowCurrentLocation={true}
            showPopularDestinations={true}
          />
        </div>
      </div>

      {value && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
          <p className="text-teal-900 font-medium">{value.display_name}</p>
          <p className="text-teal-700 text-xs mt-1">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  )
}
