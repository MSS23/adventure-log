/**
 * Database optimization utilities for improved query performance
 */

import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

interface QueryOptions {
  cache?: boolean
  timeout?: number
  retries?: number
  batchSize?: number
}

interface BatchQueryResult<T> {
  data: T[]
  errors: Error[]
  totalProcessed: number
}

/**
 * Enhanced database query utilities with optimization features
 */
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer
  private queryCache = new Map<string, { data: unknown; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer()
    }
    return DatabaseOptimizer.instance
  }

  /**
   * Optimized query with caching and retry logic
   */
  async query<T>(
    table: string,
    query: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      cache = true,
      timeout = 10000,
      retries = 3
    } = options

    const cacheKey = `${table}:${JSON.stringify(query)}`
    
    // Check cache first
    if (cache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        log.debug('Query cache hit', {
          component: 'DatabaseOptimizer',
          action: 'cache-hit',
          table,
          cacheKey
        })
        return cached.data as T[]
      }
    }

    const supabase = createClient()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = performance.now()
        
        const { data, error } = await Promise.race([
          supabase.from(table).select().match(query),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ])

        const endTime = performance.now()
        const queryTime = endTime - startTime

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        // Cache successful results
        if (cache && data) {
          this.queryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          })
        }

        log.info('Database query completed', {
          component: 'DatabaseOptimizer',
          action: 'query-success',
          table,
          attempt,
          queryTime: Math.round(queryTime),
          resultCount: data?.length || 0
        })

        return data || []

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        log.warn('Database query failed', {
          component: 'DatabaseOptimizer',
          action: 'query-retry',
          table,
          attempt,
          error: lastError.message
        })

        if (attempt === retries) {
          break
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError || new Error('Database query failed after retries')
  }

  /**
   * Batch query multiple records efficiently
   */
  async batchQuery<T>(
    table: string,
    queries: Record<string, unknown>[],
    options: QueryOptions = {}
  ): Promise<BatchQueryResult<T>> {
    const { batchSize = 50 } = options
    const results: T[] = []
    const errors: Error[] = []
    let totalProcessed = 0

    // Process queries in batches
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(query => this.query<T>(table, query, { ...options, cache: false }))
        )

        batchResults.forEach((result, index) => {
          totalProcessed++
          
          if (result.status === 'fulfilled') {
            results.push(...result.value)
          } else {
            errors.push(new Error(`Batch query ${i + index} failed: ${result.reason}`))
          }
        })

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < queries.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        const batchError = error instanceof Error ? error : new Error(String(error))
        errors.push(new Error(`Batch processing failed: ${batchError.message}`))
        totalProcessed += batch.length
      }
    }

    log.info('Batch query completed', {
      component: 'DatabaseOptimizer',
      action: 'batch-query-complete',
      table,
      totalQueries: queries.length,
      totalProcessed,
      successCount: results.length,
      errorCount: errors.length
    })

    return {
      data: results,
      errors,
      totalProcessed
    }
  }

  /**
   * Optimized album query with photos
   */
  async getAlbumsWithPhotos(userId: string, limit = 50): Promise<Record<string, unknown>[]> {
    const supabase = createClient()
    
    try {
      // Single query with join to get albums and photo counts
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select(`
          *,
          photos:album_photos(count),
          legacy_photos:photos(count)
        `)
        .eq('user_id', userId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (albumsError) {
        throw albumsError
      }

      // Transform the data to include total photo count
      const albumsWithCounts = albums?.map(album => ({
        ...album,
        photo_count: (album.photos?.[0]?.count || 0) + (album.legacy_photos?.[0]?.count || 0)
      })) || []

      log.info('Albums with photos fetched', {
        component: 'DatabaseOptimizer',
        action: 'get-albums-with-photos',
        userId,
        albumCount: albumsWithCounts.length
      })

      return albumsWithCounts

    } catch (error) {
      log.error('Failed to fetch albums with photos', {
        component: 'DatabaseOptimizer',
        action: 'get-albums-with-photos-error',
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Optimized travel timeline query
   */
  async getTravelTimeline(userId: string): Promise<Record<string, unknown>[]> {
    const supabase = createClient()
    
    try {
      // Use a single query with proper aggregation
      const { data, error } = await supabase
        .rpc('get_user_travel_timeline', {
          p_user_id: userId
        })

      if (error) {
        // Fallback to manual query if RPC doesn't exist
        log.warn('RPC function not available, using fallback query', {
          component: 'DatabaseOptimizer',
          action: 'travel-timeline-fallback',
          error: error.message
        })

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('albums')
          .select(`
            id,
            title,
            latitude,
            longitude,
            location_name,
            country_code,
            start_date,
            end_date,
            cover_photo_url,
            cover_image_url,
            favorite_photo_urls,
            photos:album_photos(storage_path),
            legacy_photos:photos(file_path)
          `)
          .eq('user_id', userId)
          .neq('status', 'draft')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('start_date', { ascending: false })

        if (fallbackError) {
          throw fallbackError
        }

        return fallbackData || []
      }

      return data || []

    } catch (error) {
      log.error('Failed to fetch travel timeline', {
        component: 'DatabaseOptimizer',
        action: 'get-travel-timeline-error',
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear specific pattern
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear()
    }

    log.info('Query cache cleared', {
      component: 'DatabaseOptimizer',
      action: 'clear-cache',
      pattern: pattern || 'all'
    })
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Hit rate tracking - placeholder for future implementation
    }
  }

  /**
   * Optimized photo upload with batch processing
   */
  async batchUploadPhotos(
    albumId: string,
    photos: Array<{ file_path: string; caption?: string; alt_text?: string }>,
    batchSize = 10
  ): Promise<{ success: number; errors: Error[] }> {
    const supabase = createClient()
    const errors: Error[] = []
    let success = 0

    // Process photos in batches
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize)
      
      try {
        const batchData = batch.map(photo => ({
          album_id: albumId,
          storage_path: photo.file_path,
          caption: photo.caption || '',
          alt_text: photo.alt_text || ''
        }))

        const { error } = await supabase
          .from('album_photos')
          .insert(batchData)

        if (error) {
          throw error
        }

        success += batch.length

        // Small delay between batches
        if (i + batchSize < photos.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }

      } catch (error) {
        const batchError = error instanceof Error ? error : new Error(String(error))
        errors.push(new Error(`Batch upload ${i}-${i + batch.length} failed: ${batchError.message}`))
      }
    }

    log.info('Batch photo upload completed', {
      component: 'DatabaseOptimizer',
      action: 'batch-upload-photos',
      albumId,
      totalPhotos: photos.length,
      successCount: success,
      errorCount: errors.length
    })

    return { success, errors }
  }
}

// Export singleton instance
export const databaseOptimizer = DatabaseOptimizer.getInstance()

// Convenience functions
export const optimizedQuery = <T>(table: string, query: Record<string, unknown>, options?: QueryOptions) =>
  databaseOptimizer.query<T>(table, query, options)

export const getAlbumsWithPhotos = (userId: string, limit?: number) =>
  databaseOptimizer.getAlbumsWithPhotos(userId, limit)

export const getTravelTimeline = (userId: string) =>
  databaseOptimizer.getTravelTimeline(userId)

export const batchUploadPhotos = (albumId: string, photos: { file_path: string; caption?: string; alt_text?: string }[], batchSize?: number) =>
  databaseOptimizer.batchUploadPhotos(albumId, photos, batchSize)
