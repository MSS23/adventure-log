'use client'

import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  label?: string
  startDateError?: string
  endDateError?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = "Dates",
  startDateError,
  endDateError
}: DateRangePickerProps) {
  const maxDate = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5">
          <Label htmlFor="start_date" className="text-xs text-gray-600">
            Start Date
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              max={maxDate}
              className={cn(
                "pl-10 h-11 border-gray-300 rounded-lg",
                startDateError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
          </div>
          {startDateError && (
            <p className="text-xs text-red-600">{startDateError}</p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <Label htmlFor="end_date" className="text-xs text-gray-600">
            End Date
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              max={maxDate}
              className={cn(
                "pl-10 h-11 border-gray-300 rounded-lg",
                endDateError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
          </div>
          {endDateError && (
            <p className="text-xs text-red-600">{endDateError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
