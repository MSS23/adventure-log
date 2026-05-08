'use client'

import { LocationDropdown } from '@/components/location/LocationDropdown'
import { type LocationData } from '@/lib/utils/locationUtils'
import { Label } from '@/components/ui/label'
import { sanitizeText } from '@/lib/utils/input-validation'

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
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {showAutoFillButton && onAutoFill && (
            <button
              type="button"
              onClick={onAutoFill}
              disabled={isAutoFilling}
              className="text-xs text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium transition-colors disabled:opacity-50"
            >
              {isAutoFilling ? 'Extracting...' : 'Auto-fill from Photos'}
            </button>
          )}
        </div>
      )}

      <LocationDropdown
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        allowCurrentLocation={true}
        showPopularDestinations={true}
      />

      {value && (
        <div className="mt-2 px-3 py-2 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800/40 rounded-lg">
          <p className="text-sm font-medium text-olive-800 dark:text-olive-200 truncate">{sanitizeText(value.display_name)}</p>
        </div>
      )}
    </div>
  )
}
