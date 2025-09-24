'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
import { LineChart } from '@/components/ui/advanced-charts'
import {
  BarChart3,
  TrendingUp,
  Activity,
  BarChart2,
  Maximize2
} from 'lucide-react'
import { TravelPattern, GeographicInsight, PhotoAnalytics } from '@/lib/services/analyticsService'

interface ChartComparisonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    travelPatterns: TravelPattern[]
    geographicDistribution: GeographicInsight[]
    photoAnalytics: PhotoAnalytics | null
  }
}

interface ComparisonMetric {
  id: string
  name: string
  description: string
  type: 'line' | 'area' | 'bar'
  color: string
  icon: React.ComponentType<{ className?: string }>
  dataKey: keyof TravelPattern
}

const availableMetrics: ComparisonMetric[] = [
  {
    id: 'albums',
    name: 'Albums Created',
    description: 'Number of albums created over time',
    type: 'line',
    color: '#3B82F6',
    icon: BarChart3,
    dataKey: 'albumsCreated'
  },
  {
    id: 'photos',
    name: 'Photos Taken',
    description: 'Total photos captured per period',
    type: 'area',
    color: '#10B981',
    icon: Activity,
    dataKey: 'photosCount'
  },
  {
    id: 'countries',
    name: 'Countries Visited',
    description: 'Unique countries explored',
    type: 'line',
    color: '#F59E0B',
    icon: TrendingUp,
    dataKey: 'countriesVisited'
  },
  {
    id: 'cities',
    name: 'Cities Explored',
    description: 'Cities and locations discovered',
    type: 'line',
    color: '#EF4444',
    icon: TrendingUp,
    dataKey: 'citiesExplored'
  },
  {
    id: 'average',
    name: 'Avg Photos/Album',
    description: 'Average photos per album',
    type: 'area',
    color: '#8B5CF6',
    icon: Activity,
    dataKey: 'averagePhotosPerAlbum'
  }
]

type ComparisonMode = 'overlay' | 'sidebyside'
type TimeComparison = 'none' | 'yearoveryear' | 'monthovermonth'

export function ChartComparisonModal({
  open,
  onOpenChange,
  data
}: ChartComparisonModalProps) {
  const [primaryMetric, setPrimaryMetric] = useState<string>('albums')
  const [secondaryMetric, setSecondaryMetric] = useState<string>('photos')
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('overlay')
  const [timeComparison, setTimeComparison] = useState<TimeComparison>('none')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)

  // Prepare chart data
  const chartData = useMemo(() => {
    const primaryMetricData = availableMetrics.find(m => m.id === primaryMetric)
    const secondaryMetricData = availableMetrics.find(m => m.id === secondaryMetric)

    if (!primaryMetricData || !secondaryMetricData) return null

    return {
      primary: data.travelPatterns.map(pattern => ({
        date: pattern.period,
        value: pattern[primaryMetricData.dataKey] as number,
        label: `${primaryMetricData.name}: ${pattern[primaryMetricData.dataKey]}`
      })),
      secondary: data.travelPatterns.map(pattern => ({
        date: pattern.period,
        value: pattern[secondaryMetricData.dataKey] as number,
        label: `${secondaryMetricData.name}: ${pattern[secondaryMetricData.dataKey]}`
      }))
    }
  }, [data.travelPatterns, primaryMetric, secondaryMetric])

  // Calculate comparison insights
  const insights = useMemo(() => {
    if (!chartData) return null

    const primaryTotal = chartData.primary.reduce((sum, point) => sum + point.value, 0)
    const secondaryTotal = chartData.secondary.reduce((sum, point) => sum + point.value, 0)
    const primaryAvg = primaryTotal / chartData.primary.length
    const secondaryAvg = secondaryTotal / chartData.secondary.length

    // Find peaks
    const primaryPeak = chartData.primary.reduce((max, point) =>
      point.value > max.value ? point : max, chartData.primary[0])
    const secondaryPeak = chartData.secondary.reduce((max, point) =>
      point.value > max.value ? point : max, chartData.secondary[0])

    // Calculate correlation (simplified)
    const correlation = calculateCorrelation(
      chartData.primary.map(p => p.value),
      chartData.secondary.map(p => p.value)
    )

    return {
      primaryTotal,
      secondaryTotal,
      primaryAvg: Math.round(primaryAvg * 100) / 100,
      secondaryAvg: Math.round(secondaryAvg * 100) / 100,
      primaryPeak,
      secondaryPeak,
      correlation: Math.round(correlation * 100) / 100
    }
  }, [chartData])

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length
    if (n === 0) return 0

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  const primaryMetricData = availableMetrics.find(m => m.id === primaryMetric)
  const secondaryMetricData = availableMetrics.find(m => m.id === secondaryMetric)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Chart Comparison Analysis
          </DialogTitle>
          <DialogDescription>
            Compare different metrics and identify patterns in your travel data
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Panel */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Metric */}
            <div>
              <label className="text-sm font-medium mb-2 block">Primary Metric</label>
              <Select value={primaryMetric} onValueChange={setPrimaryMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        {metric.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Metric */}
            <div>
              <label className="text-sm font-medium mb-2 block">Secondary Metric</label>
              <Select value={secondaryMetric} onValueChange={setSecondaryMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        {metric.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comparison Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Display Mode</label>
              <Select value={comparisonMode} onValueChange={(value: ComparisonMode) => setComparisonMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overlay">Overlay Charts</SelectItem>
                  <SelectItem value="sidebyside">Side by Side</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Comparison */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Analysis</label>
              <Select value={timeComparison} onValueChange={(value: TimeComparison) => setTimeComparison(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standard View</SelectItem>
                  <SelectItem value="yearoveryear">Year over Year</SelectItem>
                  <SelectItem value="monthovermonth">Month over Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          {comparisonMode === 'overlay' && chartData ? (
            <div className="relative">
              <div className="h-80 relative">
                {/* Primary chart */}
                <div className="absolute inset-0">
                  <LineChart
                    data={chartData.primary}
                    height={320}
                    color={primaryMetricData?.color}
                    showGrid={true}
                    onPointClick={(point) => {
                      setSelectedPeriod(point.date)
                    }}
                  />
                </div>

                {/* Secondary chart overlay */}
                <div className="absolute inset-0 opacity-70">
                  <LineChart
                    data={chartData.secondary}
                    height={320}
                    color={secondaryMetricData?.color}
                    showGrid={false}
                    showDots={false}
                  />
                </div>

                {/* Legend */}
                <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-sm border space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primaryMetricData?.color }}
                    />
                    <span>{primaryMetricData?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: secondaryMetricData?.color }}
                    />
                    <span>{secondaryMetricData?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Chart */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: primaryMetricData?.color }}
                  />
                  <h4 className="font-medium">{primaryMetricData?.name}</h4>
                </div>
                {chartData && (
                  <LineChart
                    data={chartData.primary}
                    height={250}
                    color={primaryMetricData?.color}
                    showGrid={true}
                    onPointClick={(point) => {
                      setSelectedPeriod(point.date)
                    }}
                  />
                )}
              </div>

              {/* Secondary Chart */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: secondaryMetricData?.color }}
                  />
                  <h4 className="font-medium">{secondaryMetricData?.name}</h4>
                </div>
                {chartData && (
                  <LineChart
                    data={chartData.secondary}
                    height={250}
                    color={secondaryMetricData?.color}
                    showGrid={true}
                    onPointClick={(point) => {
                      setSelectedPeriod(point.date)
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Insights Panel */}
        {insights && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Comparison Insights
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Totals */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Comparison</div>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{primaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.primaryTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{secondaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.secondaryTotal}</span>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Average Values</div>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{primaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.primaryAvg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{secondaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.secondaryAvg}</span>
                  </div>
                </div>
              </div>

              {/* Peak Periods */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Peak Periods</div>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{primaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.primaryPeak?.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-800 truncate">{secondaryMetricData?.name}:</span>
                    <span className="font-medium">{insights.secondaryPeak?.date}</span>
                  </div>
                </div>
              </div>

              {/* Correlation */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Correlation</div>
                <div className="mt-1 text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {Math.abs(insights.correlation) > 0.7 ? '📈' :
                     Math.abs(insights.correlation) > 0.3 ? '📊' : '📉'}
                  </div>
                  <div className="text-sm text-gray-800">
                    {insights.correlation > 0.7 ? 'Strong Positive' :
                     insights.correlation > 0.3 ? 'Moderate Positive' :
                     insights.correlation < -0.3 ? 'Negative' : 'Weak'}
                  </div>
                  <div className="text-sm text-gray-800">
                    {insights.correlation}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Period Details */}
            {selectedPeriod && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500"
              >
                <h5 className="font-medium text-gray-900 mb-2">
                  Period Details: {selectedPeriod}
                </h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-800">{primaryMetricData?.name}: </span>
                    <span className="font-medium">
                      {chartData?.primary.find(p => p.date === selectedPeriod)?.value || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-800">{secondaryMetricData?.name}: </span>
                    <span className="font-medium">
                      {chartData?.secondary.find(p => p.date === selectedPeriod)?.value || 0}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              // Future: Export comparison data
              console.log('Export comparison data')
            }}
            className="flex items-center gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Export Comparison
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}