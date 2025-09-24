'use client'

import { useState, useEffect } from 'react'
import { useDashboardStats, useRecentAlbums } from '@/lib/hooks/useStats'
import { analyticsService } from '@/lib/services/analyticsService'
import type { TravelPattern, GeographicInsight, PhotoAnalytics, AdventureScore } from '@/lib/services/analyticsService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, AreaChart, CalendarHeatmap, TimelineChart } from '@/components/ui/advanced-charts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Camera,
  Calendar,
  Globe,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter,
  RefreshCw,
  BarChart2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ExportModal } from '@/components/analytics/ExportModal'
import { AdvancedFilterModal, AnalyticsFilters } from '@/components/analytics/AdvancedFilterModal'
import { ChartComparisonModal } from '@/components/analytics/ChartComparisonModal'
import { AutoRefreshSettings } from '@/components/analytics/AutoRefreshSettings'
import { ExportData } from '@/lib/services/exportService'
import { useAlbumsRealTime, usePhotosRealTime } from '@/lib/hooks/useRealTime'

export default function AnalyticsPage() {
  const { stats, loading, error } = useDashboardStats()
  const { data: recentAlbumsData } = useRecentAlbums(50) // Get more albums for analytics
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [drillDownData, setDrillDownData] = useState<{
    period: string
    data: {
      date: string
      value: number
      label?: string
      detailsFromPattern?: TravelPattern
    }
  } | null>(null)
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: { preset: 'alltime' },
    locations: [],
    albumTypes: [],
    photoCount: {},
    metrics: ['albums', 'photos', 'countries', 'cities'],
    countries: [],
    groupBy: 'month',
    includeEmptyPeriods: true,
    chartTypes: ['line', 'area', 'bar', 'pie']
  })
  const [analyticsData, setAnalyticsData] = useState<{
    travelPatterns: TravelPattern[]
    geographicDistribution: GeographicInsight[]
    photoAnalytics: PhotoAnalytics | null
    adventureScore: AdventureScore | null
    seasonalInsights: unknown[]
    timelineEvents: unknown[]
  }>({
    travelPatterns: [],
    geographicDistribution: [],
    photoAnalytics: null,
    adventureScore: null,
    seasonalInsights: [],
    timelineEvents: []
  })

  // Real-time subscriptions
  const albumsRealTime = useAlbumsRealTime()
  const photosRealTime = usePhotosRealTime()

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshInterval) return

    const intervalId = setInterval(async () => {
      setRefreshing(true)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate refresh
      setLastRefreshTime(new Date())
      setRefreshing(false)
    }, autoRefreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefreshInterval])

  // Handle real-time updates
  useEffect(() => {
    if (realTimeEnabled && albumsRealTime.lastUpdate) {
      // Trigger a data refresh when albums change
      setRefreshing(true)
      setTimeout(() => {
        setRefreshing(false)
        setLastRefreshTime(new Date())
      }, 500)
    }
  }, [albumsRealTime.lastUpdate, realTimeEnabled])

  useEffect(() => {
    if (realTimeEnabled && photosRealTime.lastUpdate) {
      // Trigger a data refresh when photos change
      setRefreshing(true)
      setTimeout(() => {
        setRefreshing(false)
        setLastRefreshTime(new Date())
      }, 500)
    }
  }, [photosRealTime.lastUpdate, realTimeEnabled])

  // Process analytics data when albums are loaded
  useEffect(() => {
    if (recentAlbumsData && Array.isArray(recentAlbumsData)) {
      const albums = recentAlbumsData as Array<{
        id: string
        title: string
        start_date?: string
        end_date?: string
        location_name?: string
        country_id?: number
        city_id?: number
        created_at: string
        photos?: Array<{
          id: string
          taken_at?: string
          latitude?: number
          longitude?: number
          camera_make?: string
          camera_model?: string
          iso?: number
          aperture?: number
          shutter_speed?: number
          created_at: string
        }>
      }>
      const allPhotos = albums.flatMap(album => album.photos || [])

      const travelPatterns = analyticsService.generateTravelPatterns(albums, 'month')
      const geographicDistribution = analyticsService.analyzeGeographicDistribution(albums)
      const photoAnalytics = analyticsService.generatePhotoAnalytics(allPhotos)
      const adventureScore = analyticsService.calculateAdventureScore(albums, allPhotos)
      const seasonalInsights = analyticsService.generateSeasonalInsights(albums)
      const timelineEvents = analyticsService.generateTimelineEvents(albums)

      setAnalyticsData({
        travelPatterns,
        geographicDistribution,
        photoAnalytics,
        adventureScore,
        seasonalInsights,
        timelineEvents
      })
    }
  }, [recentAlbumsData])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const handleExport = () => {
    setExportModalOpen(true)
  }

  const handleApplyFilters = () => {
    // Re-process analytics data with new filters
    // For now, just log the filters
    console.log('Applying filters:', filters)
  }

  const handleChartClick = (point: { date: string; value: number; label?: string }) => {
    // Handle chart point click - show drill-down data
    setDrillDownData({
      period: point.date,
      data: {
        ...point,
        detailsFromPattern: analyticsData.travelPatterns.find(p => p.period === point.date)
      }
    })
  }

  const handleRangeSelect = (startIndex: number, endIndex: number) => {
    // Handle chart range selection - filter data by selected range
    const selectedData = analyticsData.travelPatterns.slice(startIndex, endIndex + 1)
    console.log('Selected range data:', selectedData)

    // You could update filters or show filtered view here
    // For now, just log the selection
  }

  // Prepare export data
  const exportData: ExportData = {
    userStats: {
      totalAlbums: stats.totalAlbums,
      totalPhotos: stats.totalPhotos,
      countriesVisited: stats.countriesVisited,
      citiesExplored: stats.citiesExplored
    },
    travelPatterns: analyticsData.travelPatterns,
    geographicDistribution: analyticsData.geographicDistribution,
    photoAnalytics: analyticsData.photoAnalytics,
    adventureScore: analyticsData.adventureScore || undefined,
    timelineEvents: analyticsData.timelineEvents as Array<{
      date: string
      title: string
      description: string
      value: number
      type: 'travel' | 'photo' | 'milestone'
    }>
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>

        <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Analytics Unavailable</h3>
              <p className="text-red-700 mb-4">Unable to load your analytics data</p>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Travel Analytics
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600"
          >
            Deep insights into your adventures and photography
          </motion.p>
        </div>

        <div className="flex items-center gap-3">
          <AutoRefreshSettings
            onRefreshIntervalChange={setAutoRefreshInterval}
            onRealTimeToggle={setRealTimeEnabled}
            currentInterval={autoRefreshInterval}
            realTimeEnabled={realTimeEnabled}
            isRefreshing={refreshing}
            lastRefresh={lastRefreshTime || undefined}
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={() => setComparisonModalOpen(true)}>
            <BarChart2 className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((stats.countriesVisited * 2500 + stats.citiesExplored * 150)).toLocaleString()} km
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% this month
                  </Badge>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Adventure Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.min(Math.round((stats.countriesVisited * 10 + stats.citiesExplored * 2) / 10), 100)}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <Activity className="h-3 w-3 mr-1" />
                    Level {Math.floor(stats.countriesVisited / 3) + 1}
                  </Badge>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Photos per Trip</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalAlbums > 0 ? Math.round(stats.totalPhotos / stats.totalAlbums) : 0}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <Camera className="h-3 w-3 mr-1" />
                    {stats.totalPhotos} total
                  </Badge>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Camera className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Months</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.max(1, Math.round(stats.totalAlbums * 0.6))}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    This year
                  </Badge>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analytics Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Travel Patterns</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
            <TabsTrigger value="photos">Photo Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card data-chart-export data-chart-name="travel-activity-trends">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Travel Activity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData.travelPatterns.length > 0 ? (
                    <LineChart
                      data={analyticsData.travelPatterns.map(pattern => ({
                        date: pattern.period,
                        value: pattern.albumsCreated,
                        label: `${pattern.albumsCreated} albums, ${pattern.photosCount} photos`
                      }))}
                      height={250}
                      color="#3B82F6"
                      showGrid={true}
                      onPointClick={handleChartClick}
                      onRangeSelect={handleRangeSelect}
                      selectable={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Create albums to see travel trends</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-chart-export data-chart-name="cumulative-progress">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cumulative Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData.travelPatterns.length > 0 ? (
                    <AreaChart
                      data={analyticsData.travelPatterns.map((pattern, index) => ({
                        date: pattern.period,
                        value: analyticsData.travelPatterns.slice(0, index + 1).reduce((sum, p) => sum + p.albumsCreated, 0)
                      }))}
                      height={250}
                      colors={['#10B981']}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Progress tracking will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {!!analyticsData.adventureScore && typeof analyticsData.adventureScore === 'object' && analyticsData.adventureScore !== null && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Adventure Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {analyticsData.adventureScore?.score}
                        </div>
                        <div className="text-lg font-medium text-gray-900">
                          {analyticsData.adventureScore?.level}
                        </div>
                        <p className="text-sm text-gray-600">
                          {analyticsData.adventureScore?.nextLevelRequirement}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Exploration</span>
                        <Badge variant="secondary">{analyticsData.adventureScore?.breakdown?.exploration}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Photography</span>
                        <Badge variant="secondary">{analyticsData.adventureScore?.breakdown?.photography}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Consistency</span>
                        <Badge variant="secondary">{analyticsData.adventureScore?.breakdown?.consistency}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Diversity</span>
                        <Badge variant="secondary">{analyticsData.adventureScore?.breakdown?.diversity}%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Calendar */}
            <Card data-chart-export data-chart-name="activity-calendar">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Activity Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarHeatmap
                  data={analyticsData.travelPatterns.flatMap((pattern) => {
                    // Generate mock daily data for demonstration
                    const date = new Date(pattern.period + '-01')
                    return Array.from({ length: 30 }, (_, i) => {
                      const dayDate = new Date(date)
                      dayDate.setDate(i + 1)
                      return {
                        date: dayDate.toISOString().split('T')[0],
                        value: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
                      }
                    })
                  })}
                  colorScheme="green"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            {/* Seasonal Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Seasonal Travel Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.seasonalInsights.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analyticsData.seasonalInsights.map((season: unknown) => (
                      <div
                        key={(season as { season?: string })?.season}
                        className="text-center p-6 rounded-lg border-2 transition-all hover:scale-105"
                        style={{
                          borderColor: (season as { color?: string })?.color + '40',
                          backgroundColor: (season as { color?: string })?.color + '10'
                        }}
                      >
                        <div
                          className="text-3xl font-bold mb-2"
                          style={{ color: (season as { color?: string })?.color }}
                        >
                          {(season as { percentage?: number })?.percentage}%
                        </div>
                        <div className="text-lg font-semibold mb-1">{(season as { season?: string })?.season}</div>
                        <div className="text-sm text-gray-600 mb-2">{(season as { description?: string })?.description}</div>
                        <Badge variant="outline" style={{ borderColor: (season as { color?: string })?.color, color: (season as { color?: string })?.color }}>
                          {(season as { count?: number })?.count} trips
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Create albums to see seasonal patterns</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Travel Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Travel Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.timelineEvents.length > 0 ? (
                  <TimelineChart
                    data={analyticsData.timelineEvents as Array<{
                      date: string
                      title: string
                      description?: string
                      value: number
                      type?: 'travel' | 'photo' | 'milestone'
                    }>}
                    height={400}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Timeline will appear as you create more adventures</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Activity Breakdown */}
            {analyticsData.photoAnalytics && analyticsData.photoAnalytics.monthlyActivity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Photography Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(analyticsData.photoAnalytics.monthlyActivity).map(([month, count]) => (
                      <div key={month} className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">{count}</div>
                        <div className="text-sm text-gray-600">{month}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="geographic" className="space-y-6">
            {/* Regional Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.geographicDistribution.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {analyticsData.geographicDistribution.map((region) => (
                        <div key={region.region} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: region.color }}
                            />
                            <div>
                              <div className="font-medium">{region.region}</div>
                              <div className="text-sm text-gray-600">{region.count} destinations</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold" style={{ color: region.color }}>
                              {region.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-64 h-64 relative">
                        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                          {analyticsData.geographicDistribution.map((region, index) => {
                            const startAngle = analyticsData.geographicDistribution
                              .slice(0, index)
                              .reduce((sum, r) => sum + (r.percentage / 100) * 360, 0)
                            const endAngle = startAngle + (region.percentage / 100) * 360
                            const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
                            const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
                            const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
                            const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)
                            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

                            return (
                              <path
                                key={region.region}
                                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                fill={region.color}
                                className="hover:opacity-80 transition-opacity"
                              />
                            )
                          })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {analyticsData.geographicDistribution.reduce((sum, region) => sum + region.count, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Explore different regions to see geographic distribution</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Distance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {Math.round((stats.countriesVisited * 2500 + stats.citiesExplored * 150)).toLocaleString()} km
                  </div>
                  <p className="text-sm text-gray-600">Estimated travel distance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average per Trip</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {stats.totalAlbums > 0 ?
                      Math.round((stats.countriesVisited * 2500 + stats.citiesExplored * 150) / stats.totalAlbums).toLocaleString() : 0
                    } km
                  </div>
                  <p className="text-sm text-gray-600">Distance per adventure</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exploration Radius</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.round(Math.sqrt(stats.countriesVisited * 1000000 + stats.citiesExplored * 50000) / 1000)} km
                  </div>
                  <p className="text-sm text-gray-600">From home base</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            {/* Photography Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analyticsData.photoAnalytics?.totalPhotos || stats.totalPhotos}
                  </div>
                  <p className="text-sm text-gray-600">Captured memories</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average ISO</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {analyticsData.photoAnalytics?.averageIso || 800}
                  </div>
                  <p className="text-sm text-gray-600">Light sensitivity</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Common Aperture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {analyticsData.photoAnalytics?.mostCommonAperture || 'f/5.6'}
                  </div>
                  <p className="text-sm text-gray-600">Preferred setting</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Photos per Album</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {stats.totalAlbums > 0 ? Math.round(stats.totalPhotos / stats.totalAlbums) : 0}
                  </div>
                  <p className="text-sm text-gray-600">Average per trip</p>
                </CardContent>
              </Card>
            </div>

            {/* Camera Equipment Usage */}
            {analyticsData.photoAnalytics && Object.keys(analyticsData.photoAnalytics.cameraMakes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Equipment Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analyticsData.photoAnalytics.cameraMakes).map(([make, count]) => (
                      <div key={make} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
                        <div className="text-sm text-gray-600">{make}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time of Day Analysis */}
            {analyticsData.photoAnalytics && Object.keys(analyticsData.photoAnalytics.timeOfDayDistribution).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Photography Time Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analyticsData.photoAnalytics.timeOfDayDistribution).map(([timeOfDay, count]) => {
                      const total = Object.values(analyticsData.photoAnalytics!.timeOfDayDistribution).reduce((a, b) => a + b, 0)
                      const percentage = Math.round((count / total) * 100)
                      const colors = {
                        'Morning': 'text-yellow-600 bg-yellow-50',
                        'Afternoon': 'text-blue-600 bg-blue-50',
                        'Evening': 'text-orange-600 bg-orange-50',
                        'Night': 'text-purple-600 bg-purple-50'
                      }

                      return (
                        <div key={timeOfDay} className={`text-center p-4 rounded-lg ${colors[timeOfDay as keyof typeof colors] || 'bg-gray-50'}`}>
                          <div className="text-2xl font-bold mb-1">{percentage}%</div>
                          <div className="font-medium mb-1">{timeOfDay}</div>
                          <div className="text-sm opacity-75">{count} photos</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photo Quality Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Photography Quality Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-900">Composition Style</span>
                      </div>
                      <p className="text-sm text-green-800">
                        {stats.totalPhotos > 100 ? 'Experienced photographer' :
                         stats.totalPhotos > 50 ? 'Developing eye for detail' :
                         'Building photography skills'}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-900">Technical Skills</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        {analyticsData.photoAnalytics?.averageIso ?
                          (analyticsData.photoAnalytics.averageIso < 400 ? 'Great use of natural light' :
                           analyticsData.photoAnalytics.averageIso < 1600 ? 'Good technical balance' :
                           'Comfortable with challenging lighting') :
                          'Technical data will appear as you upload photos with EXIF'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-purple-900">Adventure Documentation</span>
                      </div>
                      <p className="text-sm text-purple-800">
                        {stats.totalAlbums > 0 && stats.totalPhotos > 0 ?
                          `${Math.round(stats.totalPhotos / stats.totalAlbums)} photos per adventure - ${
                            stats.totalPhotos / stats.totalAlbums > 30 ? 'Comprehensive storyteller' :
                            stats.totalPhotos / stats.totalAlbums > 15 ? 'Good documentation' :
                            'Quality over quantity approach'
                          }` :
                          'Start creating albums to see documentation patterns'
                        }
                      </p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="font-medium text-orange-900">Growth Trend</span>
                      </div>
                      <p className="text-sm text-orange-800">
                        {stats.countriesVisited > 3 ? 'Expanding photographic horizons' :
                         stats.citiesExplored > 5 ? 'Building local expertise' :
                         'Beginning the photography journey'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Quick Insights Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {stats.countriesVisited > 0 ? 'Explorer' : 'Getting Started'}
                </div>
                <p className="text-sm text-blue-700">
                  {stats.countriesVisited > 0
                    ? `You've visited ${stats.countriesVisited} countries!`
                    : 'Start your adventure journey'
                  }
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {stats.totalPhotos > 50 ? 'Photographer' : stats.totalPhotos > 10 ? 'Shutterbug' : 'Beginner'}
                </div>
                <p className="text-sm text-green-700">
                  {stats.totalPhotos} photos captured across your journeys
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {Math.round((stats.countriesVisited + stats.citiesExplored) / Math.max(stats.totalAlbums, 1) * 10)}%
                </div>
                <p className="text-sm text-purple-700">
                  Geographic diversity score
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        data={exportData}
        title="Export Analytics Data"
      />

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
      />

      {/* Chart Comparison Modal */}
      <ChartComparisonModal
        open={comparisonModalOpen}
        onOpenChange={setComparisonModalOpen}
        data={{
          travelPatterns: analyticsData.travelPatterns,
          geographicDistribution: analyticsData.geographicDistribution,
          photoAnalytics: analyticsData.photoAnalytics
        }}
      />

      {/* Drill-down Data Display */}
      {drillDownData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border max-w-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Period Details</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrillDownData(null)}
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div><strong>Period:</strong> {drillDownData.period}</div>
            <div><strong>Value:</strong> {drillDownData.data.value}</div>
            {drillDownData.data.detailsFromPattern && (
              <>
                <div><strong>Albums:</strong> {drillDownData.data.detailsFromPattern.albumsCreated}</div>
                <div><strong>Photos:</strong> {drillDownData.data.detailsFromPattern.photosCount}</div>
                <div><strong>Countries:</strong> {drillDownData.data.detailsFromPattern.countriesVisited}</div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}