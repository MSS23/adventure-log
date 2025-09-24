/**
 * Analytics Service for Adventure Log
 * Processes travel and photo data to generate insights
 */

interface Album {
  id: string
  title: string
  start_date?: string
  end_date?: string
  location_name?: string
  country_id?: number
  city_id?: number
  created_at: string
  photos?: Photo[]
}

interface Photo {
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
}

interface TravelPattern {
  period: string
  albumsCreated: number
  photosCount: number
  countriesVisited: number
  citiesExplored: number
  averagePhotosPerAlbum: number
}

interface GeographicInsight {
  region: string
  count: number
  percentage: number
  color: string
}

interface PhotoAnalytics {
  totalPhotos: number
  cameraMakes: Record<string, number>
  averageIso: number
  mostCommonAperture: string
  timeOfDayDistribution: Record<string, number>
  monthlyActivity: Record<string, number>
}

interface TravelVelocity {
  period: string
  estimatedDistance: number
  albumsCount: number
  velocityScore: number
}

interface AdventureScore {
  score: number
  breakdown: {
    exploration: number
    photography: number
    consistency: number
    diversity: number
  }
  level: string
  nextLevelRequirement: string
}

class AnalyticsService {
  /**
   * Generate travel patterns over time (monthly/yearly)
   */
  generateTravelPatterns(albums: Album[], period: 'month' | 'year' = 'month'): TravelPattern[] {
    const patterns = new Map<string, TravelPattern>()

    albums.forEach(album => {
      const date = new Date(album.created_at)
      const key = period === 'month'
        ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        : date.getFullYear().toString()

      if (!patterns.has(key)) {
        patterns.set(key, {
          period: key,
          albumsCreated: 0,
          photosCount: 0,
          countriesVisited: new Set<number>(),
          citiesExplored: new Set<number>(),
          averagePhotosPerAlbum: 0
        } as TravelPattern & { countriesVisited: Set<number>; citiesExplored: Set<number> })
      }

      const pattern = patterns.get(key)!
      pattern.albumsCreated++
      pattern.photosCount += album.photos?.length || 0

      if (album.country_id) {
        // Type assertion needed for analytics pattern tracking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pattern.countriesVisited as any).add(album.country_id)
      }
      if (album.city_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pattern.citiesExplored as any).add(album.city_id)
      }
    })

    return Array.from(patterns.values()).map(pattern => ({
      ...pattern,
      // Type assertion for analytics pattern tracking - Set operations during processing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      countriesVisited: (pattern.countriesVisited as any).size,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      citiesExplored: (pattern.citiesExplored as any).size,
      averagePhotosPerAlbum: pattern.albumsCreated > 0 ?
        Math.round(pattern.photosCount / pattern.albumsCreated) : 0
    })).sort((a, b) => a.period.localeCompare(b.period))
  }

  /**
   * Calculate travel velocity (estimated distance over time)
   */
  calculateTravelVelocity(albums: Album[]): TravelVelocity[] {
    // Estimate distances based on countries and cities
    const estimateDistance = (countriesCount: number, citiesCount: number): number => {
      // Rough estimates: 2000km average between countries, 200km between cities
      return (countriesCount * 2000) + (citiesCount * 200)
    }

    const patterns = this.generateTravelPatterns(albums, 'month')

    return patterns.map(pattern => {
      const distance = estimateDistance(pattern.countriesVisited, pattern.citiesExplored)
      const velocityScore = distance / Math.max(pattern.albumsCreated, 1)

      return {
        period: pattern.period,
        estimatedDistance: distance,
        albumsCount: pattern.albumsCreated,
        velocityScore: Math.round(velocityScore)
      }
    })
  }

  /**
   * Analyze geographic distribution
   */
  analyzeGeographicDistribution(albums: Album[]): GeographicInsight[] {
    const regions = new Map<string, number>()

    // Mock region mapping - in production, this would use actual geographic data
    const getRegion = (countryId?: number): string => {
      if (!countryId) return 'Unknown'

      // Simplified region mapping
      const regionMap: Record<number, string> = {
        // Europe
        1: 'Europe', 2: 'Europe', 3: 'Europe', 4: 'Europe', 5: 'Europe',
        // Asia
        6: 'Asia', 7: 'Asia', 8: 'Asia', 9: 'Asia', 10: 'Asia',
        // North America
        11: 'North America', 12: 'North America', 13: 'North America',
        // South America
        14: 'South America', 15: 'South America', 16: 'South America',
        // Africa
        17: 'Africa', 18: 'Africa', 19: 'Africa',
        // Oceania
        20: 'Oceania', 21: 'Oceania'
      }

      return regionMap[countryId] || 'Other'
    }

    albums.forEach(album => {
      const region = getRegion(album.country_id)
      regions.set(region, (regions.get(region) || 0) + 1)
    })

    const total = albums.length
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
    ]

    return Array.from(regions.entries())
      .map(([region, count], index) => ({
        region,
        count,
        percentage: Math.round((count / total) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Generate photo analytics insights
   */
  generatePhotoAnalytics(photos: Photo[]): PhotoAnalytics {
    const cameraMakes = new Map<string, number>()
    const timeOfDay = new Map<string, number>()
    const monthly = new Map<string, number>()
    let totalIso = 0
    let isoCount = 0
    const apertures = new Map<string, number>()

    photos.forEach(photo => {
      // Camera make analysis
      if (photo.camera_make) {
        cameraMakes.set(photo.camera_make, (cameraMakes.get(photo.camera_make) || 0) + 1)
      }

      // Time of day analysis
      if (photo.taken_at) {
        const hour = new Date(photo.taken_at).getHours()
        let timeCategory: string
        if (hour >= 5 && hour < 12) timeCategory = 'Morning'
        else if (hour >= 12 && hour < 17) timeCategory = 'Afternoon'
        else if (hour >= 17 && hour < 21) timeCategory = 'Evening'
        else timeCategory = 'Night'

        timeOfDay.set(timeCategory, (timeOfDay.get(timeCategory) || 0) + 1)

        // Monthly distribution
        const monthKey = new Date(photo.taken_at).toLocaleDateString('en-US', { month: 'short' })
        monthly.set(monthKey, (monthly.get(monthKey) || 0) + 1)
      }

      // ISO analysis
      if (photo.iso) {
        totalIso += photo.iso
        isoCount++
      }

      // Aperture analysis
      if (photo.aperture) {
        const apertureKey = `f/${photo.aperture}`
        apertures.set(apertureKey, (apertures.get(apertureKey) || 0) + 1)
      }
    })

    // Find most common aperture
    let mostCommonAperture = 'N/A'
    let maxApertureCount = 0
    apertures.forEach((count, aperture) => {
      if (count > maxApertureCount) {
        maxApertureCount = count
        mostCommonAperture = aperture
      }
    })

    return {
      totalPhotos: photos.length,
      cameraMakes: Object.fromEntries(cameraMakes),
      averageIso: isoCount > 0 ? Math.round(totalIso / isoCount) : 0,
      mostCommonAperture,
      timeOfDayDistribution: Object.fromEntries(timeOfDay),
      monthlyActivity: Object.fromEntries(monthly)
    }
  }

  /**
   * Calculate adventure score based on various factors
   */
  calculateAdventureScore(albums: Album[], photos: Photo[]): {
    score: number
    breakdown: {
      exploration: number
      photography: number
      consistency: number
      diversity: number
    }
    level: string
    nextLevelRequirement: string
  } {
    const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id)).size
    const uniqueCities = new Set(albums.filter(a => a.city_id).map(a => a.city_id)).size

    // Exploration score (40% weight)
    const explorationScore = Math.min((uniqueCountries * 15 + uniqueCities * 3), 100)

    // Photography score (30% weight)
    const photographyScore = Math.min((photos.length * 0.5), 100)

    // Consistency score (20% weight) - based on how regularly user creates albums
    const monthsActive = this.calculateActiveMonths(albums)
    const consistencyScore = Math.min(monthsActive * 8, 100)

    // Diversity score (10% weight) - variety in locations and photo subjects
    const diversityScore = Math.min((uniqueCountries * 10 + (photos.length > 0 ? 20 : 0)), 100)

    const totalScore = Math.round(
      explorationScore * 0.4 +
      photographyScore * 0.3 +
      consistencyScore * 0.2 +
      diversityScore * 0.1
    )

    // Determine level
    let level: string
    let nextLevelRequirement: string

    if (totalScore >= 90) {
      level = 'Master Explorer'
      nextLevelRequirement = 'You\'ve reached the highest level!'
    } else if (totalScore >= 70) {
      level = 'Advanced Traveler'
      nextLevelRequirement = `${90 - totalScore} points to Master Explorer`
    } else if (totalScore >= 50) {
      level = 'Seasoned Adventurer'
      nextLevelRequirement = `${70 - totalScore} points to Advanced Traveler`
    } else if (totalScore >= 30) {
      level = 'Explorer'
      nextLevelRequirement = `${50 - totalScore} points to Seasoned Adventurer`
    } else {
      level = 'Beginning Wanderer'
      nextLevelRequirement = `${30 - totalScore} points to Explorer`
    }

    return {
      score: totalScore,
      breakdown: {
        exploration: Math.round(explorationScore),
        photography: Math.round(photographyScore),
        consistency: Math.round(consistencyScore),
        diversity: Math.round(diversityScore)
      },
      level,
      nextLevelRequirement
    }
  }

  /**
   * Generate seasonal travel preferences
   */
  generateSeasonalInsights(albums: Album[]): Array<{
    season: string
    count: number
    percentage: number
    color: string
    description: string
  }> {
    const seasons = new Map<string, number>()

    albums.forEach(album => {
      const date = album.start_date ? new Date(album.start_date) : new Date(album.created_at)
      const month = date.getMonth()

      let season: string
      if (month >= 2 && month <= 4) season = 'Spring'
      else if (month >= 5 && month <= 7) season = 'Summer'
      else if (month >= 8 && month <= 10) season = 'Autumn'
      else season = 'Winter'

      seasons.set(season, (seasons.get(season) || 0) + 1)
    })

    const total = albums.length
    const seasonData = [
      { season: 'Spring', color: '#10B981', description: 'Perfect for new beginnings' },
      { season: 'Summer', color: '#F59E0B', description: 'Peak adventure season' },
      { season: 'Autumn', color: '#EF4444', description: 'Beautiful scenery time' },
      { season: 'Winter', color: '#3B82F6', description: 'Cozy indoor explorations' }
    ]

    return seasonData.map(data => ({
      ...data,
      count: seasons.get(data.season) || 0,
      percentage: total > 0 ? Math.round(((seasons.get(data.season) || 0) / total) * 100) : 0
    }))
  }

  /**
   * Calculate active months
   */
  private calculateActiveMonths(albums: Album[]): number {
    const months = new Set<string>()

    albums.forEach(album => {
      const date = new Date(album.created_at)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      months.add(monthKey)
    })

    return months.size
  }

  /**
   * Generate timeline events for visualization
   */
  generateTimelineEvents(albums: Album[]): Array<{
    date: string
    title: string
    description: string
    value: number
    type: 'travel' | 'photo' | 'milestone'
  }> {
    const events = []

    // Add album creation events
    albums.forEach(album => {
      events.push({
        date: album.created_at,
        title: album.title,
        description: `Created album${album.location_name ? ` in ${album.location_name}` : ''}`,
        value: album.photos?.length || 0,
        type: 'travel' as const
      })
    })

    // Add milestone events based on achievements
    const countryCount = new Set(albums.filter(a => a.country_id).map(a => a.country_id)).size
    const photoCount = albums.reduce((sum, album) => sum + (album.photos?.length || 0), 0)

    if (countryCount >= 5) {
      const fifthCountryAlbum = albums.find(a => a.country_id)
      if (fifthCountryAlbum) {
        events.push({
          date: fifthCountryAlbum.created_at,
          title: '5 Countries Milestone',
          description: 'Achieved explorer status!',
          value: 5,
          type: 'milestone' as const
        })
      }
    }

    if (photoCount >= 100) {
      events.push({
        date: albums[Math.floor(albums.length / 2)]?.created_at || new Date().toISOString(),
        title: '100 Photos Milestone',
        description: 'Photography enthusiast achievement unlocked!',
        value: 100,
        type: 'photo' as const
      })
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()

// Export types
export type {
  TravelPattern,
  GeographicInsight,
  PhotoAnalytics,
  TravelVelocity,
  AdventureScore
}