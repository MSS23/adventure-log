'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Filter,
  MapPin,
  Camera,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AnalyticsFilters {
  dateRange: {
    from?: string
    to?: string
    preset?: 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'lastyear' | 'alltime'
  }
  locations: string[]
  albumTypes: string[]
  photoCount: {
    min?: number
    max?: number
  }
  metrics: string[]
  countries: string[]
  groupBy: 'month' | 'quarter' | 'year'
  includeEmptyPeriods: boolean
  chartTypes: string[]
}

interface FilterPreset {
  id: string
  name: string
  description: string
  filters: AnalyticsFilters
  icon: string
  color: string
}

interface AdvancedFilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: AnalyticsFilters
  onFiltersChange: (filters: AnalyticsFilters) => void
  onApplyFilters: () => void
}

const defaultFilters: AnalyticsFilters = {
  dateRange: { preset: 'alltime' },
  locations: [],
  albumTypes: [],
  photoCount: {},
  metrics: ['albums', 'photos', 'countries', 'cities'],
  countries: [],
  groupBy: 'month',
  includeEmptyPeriods: true,
  chartTypes: ['line', 'area', 'bar', 'pie']
}

const filterPresets: FilterPreset[] = [
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Last 3 months of travel data',
    filters: {
      ...defaultFilters,
      dateRange: { preset: 'last3months' },
      metrics: ['albums', 'photos']
    },
    icon: 'Clock',
    color: '#3B82F6'
  },
  {
    id: 'year-overview',
    name: 'Year Overview',
    description: 'Complete year analysis',
    filters: {
      ...defaultFilters,
      dateRange: { preset: 'lastyear' },
      groupBy: 'month',
      chartTypes: ['line', 'area']
    },
    icon: 'BarChart3',
    color: '#10B981'
  },
  {
    id: 'photography-focus',
    name: 'Photography Focus',
    description: 'Photo-centric analytics',
    filters: {
      ...defaultFilters,
      metrics: ['photos'],
      photoCount: { min: 5 },
      chartTypes: ['bar', 'pie']
    },
    icon: 'Camera',
    color: '#F59E0B'
  },
  {
    id: 'travel-patterns',
    name: 'Travel Patterns',
    description: 'Geographic and seasonal insights',
    filters: {
      ...defaultFilters,
      metrics: ['countries', 'cities'],
      groupBy: 'quarter',
      chartTypes: ['pie', 'area']
    },
    icon: 'TrendingUp',
    color: '#EF4444'
  }
]

const datePresets = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last3months', label: 'Last 3 months' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'lastyear', label: 'Last year' },
  { value: 'alltime', label: 'All time' }
]

const availableMetrics = [
  { value: 'albums', label: 'Albums Created', icon: 'Camera' },
  { value: 'photos', label: 'Photos Taken', icon: 'Camera' },
  { value: 'countries', label: 'Countries Visited', icon: 'MapPin' },
  { value: 'cities', label: 'Cities Explored', icon: 'MapPin' },
  { value: 'distance', label: 'Distance Traveled', icon: 'TrendingUp' },
  { value: 'duration', label: 'Trip Duration', icon: 'Clock' }
]

const chartTypeOptions = [
  { value: 'line', label: 'Line Chart', icon: 'TrendingUp' },
  { value: 'area', label: 'Area Chart', icon: 'Activity' },
  { value: 'bar', label: 'Bar Chart', icon: 'BarChart3' },
  { value: 'pie', label: 'Pie Chart', icon: 'PieChart' }
]

export function AdvancedFilterModal({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters
}: AdvancedFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'advanced'>('presets')

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApplyPreset = (preset: FilterPreset) => {
    setLocalFilters(preset.filters)
    onFiltersChange(preset.filters)
    onApplyFilters()
    onOpenChange(false)
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onApplyFilters()
    onOpenChange(false)
  }

  const handleResetFilters = () => {
    setLocalFilters(defaultFilters)
  }

  const updateFilters = (updates: Partial<AnalyticsFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...updates }))
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (localFilters.dateRange.preset !== 'alltime') count++
    if (localFilters.locations.length > 0) count++
    if (localFilters.countries.length > 0) count++
    if (localFilters.photoCount.min || localFilters.photoCount.max) count++
    if (localFilters.metrics.length !== availableMetrics.length) count++
    return count
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Analytics Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Customize your analytics view with advanced filtering and grouping options
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'presets', label: 'Presets', icon: Sparkles },
            { id: 'custom', label: 'Custom', icon: Filter },
            { id: 'advanced', label: 'Advanced', icon: RotateCcw }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'presets' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-md"
                        style={{ backgroundColor: preset.color + '20' }}
                      >
                        <div style={{ color: preset.color }}>
                          {preset.icon === 'Clock' && <Clock className="h-5 w-5" />}
                          {preset.icon === 'BarChart3' && <BarChart3 className="h-5 w-5" />}
                          {preset.icon === 'Camera' && <Camera className="h-5 w-5" />}
                          {preset.icon === 'TrendingUp' && <TrendingUp className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{preset.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                        <div className="flex gap-2 mt-2">
                          {preset.filters.metrics.map((metric) => (
                            <Badge key={metric} variant="outline" className="text-xs">
                              {availableMetrics.find(m => m.value === metric)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'custom' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Date Range */}
              <div>
                <Label className="text-base font-medium mb-3 block">Date Range</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => updateFilters({
                        dateRange: { preset: preset.value as 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'lastyear' | 'alltime' }
                      })}
                      className={cn(
                        "p-2 text-sm border rounded-md transition-colors",
                        localFilters.dateRange.preset === preset.value
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Metrics */}
              <div>
                <Label className="text-base font-medium mb-3 block">Metrics to Include</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableMetrics.map((metric) => (
                    <button
                      key={metric.value}
                      onClick={() => {
                        const newMetrics = localFilters.metrics.includes(metric.value)
                          ? localFilters.metrics.filter(m => m !== metric.value)
                          : [...localFilters.metrics, metric.value]
                        updateFilters({ metrics: newMetrics })
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 text-sm border rounded-md transition-colors",
                        localFilters.metrics.includes(metric.value)
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      {metric.icon === 'Camera' && <Camera className="h-4 w-4" />}
                      {metric.icon === 'MapPin' && <MapPin className="h-4 w-4" />}
                      {metric.icon === 'TrendingUp' && <TrendingUp className="h-4 w-4" />}
                      {metric.icon === 'Clock' && <Clock className="h-4 w-4" />}
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Chart Types */}
              <div>
                <Label className="text-base font-medium mb-3 block">Chart Types</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {chartTypeOptions.map((chartType) => (
                    <button
                      key={chartType.value}
                      onClick={() => {
                        const newChartTypes = localFilters.chartTypes.includes(chartType.value)
                          ? localFilters.chartTypes.filter(c => c !== chartType.value)
                          : [...localFilters.chartTypes, chartType.value]
                        updateFilters({ chartTypes: newChartTypes })
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 text-sm border rounded-md transition-colors",
                        localFilters.chartTypes.includes(chartType.value)
                          ? "bg-purple-50 border-purple-200 text-purple-700"
                          : "hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      {chartType.icon === 'TrendingUp' && <TrendingUp className="h-4 w-4" />}
                      {chartType.icon === 'Activity' && <Activity className="h-4 w-4" />}
                      {chartType.icon === 'BarChart3' && <BarChart3 className="h-4 w-4" />}
                      {chartType.icon === 'PieChart' && <PieChart className="h-4 w-4" />}
                      {chartType.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Grouping */}
              <div>
                <Label className="text-base font-medium mb-3 block">Group Data By</Label>
                <Select
                  value={localFilters.groupBy}
                  onValueChange={(value: 'month' | 'quarter' | 'year') =>
                    updateFilters({ groupBy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Count Range */}
              <div>
                <Label className="text-base font-medium mb-3 block">Photo Count Filter</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Minimum Photos</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={localFilters.photoCount.min || ''}
                      onChange={(e) => updateFilters({
                        photoCount: {
                          ...localFilters.photoCount,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Maximum Photos</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={localFilters.photoCount.max || ''}
                      onChange={(e) => updateFilters({
                        photoCount: {
                          ...localFilters.photoCount,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <Label className="text-base font-medium mb-3 block">Display Options</Label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={localFilters.includeEmptyPeriods}
                      onChange={(e) => updateFilters({ includeEmptyPeriods: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Include periods with no activity</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}