import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

// Admin client with service role key for server-side operations
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Admin utilities for storage operations
export class StorageAdmin {
  async createBucket(bucketId: string, config: {
    public?: boolean
    fileSizeLimit?: number
    allowedMimeTypes?: string[]
  } = {}) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key')
    }

    const { data, error } = await supabaseAdmin.storage.createBucket(bucketId, {
      public: config.public ?? true,
      fileSizeLimit: config.fileSizeLimit ?? 52428800, // 50MB default
      allowedMimeTypes: config.allowedMimeTypes ?? ['image/*']
    })

    if (error) {
      throw new Error(`Failed to create bucket ${bucketId}: ${error.message}`)
    }

    return data
  }

  async setupBucketPolicies(bucketId: string) {
    // This would require RLS policy setup through SQL
    // For now, just log that policies need to be set up manually
    console.log(`Bucket ${bucketId} created. Please set up RLS policies manually in Supabase dashboard.`)
  }

  async ensureBucketExists(bucketId: string, config?: Parameters<StorageAdmin['createBucket']>[1]) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key')
    }

    try {
      // Check if bucket exists
      const { data: bucket } = await supabaseAdmin.storage.getBucket(bucketId)
      if (bucket) {
        return bucket
      }
    } catch {
      // Bucket doesn't exist, create it
    }

    return this.createBucket(bucketId, config)
  }
}

export const storageAdmin = new StorageAdmin()

// Database admin utilities
export class DatabaseAdmin {
  async getUserProfile(userId: string) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key')
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`)
    }

    return data
  }

  async createUserProfile(userId: string, profileData: {
    username?: string
    display_name?: string
    bio?: string
    location?: string
    privacy_level?: 'public' | 'private'
  }) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key')
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        ...profileData
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`)
    }

    return data
  }

  async deleteUserData(userId: string) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key')
    }

    // Delete user's data in the correct order to respect foreign key constraints
    const operations = [
      // Delete photos first
      supabaseAdmin.from('photos').delete().eq('user_id', userId),
      // Delete albums
      supabaseAdmin.from('albums').delete().eq('user_id', userId),
      // Delete social data
      supabaseAdmin.from('likes').delete().eq('user_id', userId),
      supabaseAdmin.from('comments').delete().eq('user_id', userId),
      supabaseAdmin.from('favorites').delete().eq('user_id', userId),
      supabaseAdmin.from('followers').delete().eq('follower_id', userId),
      supabaseAdmin.from('followers').delete().eq('following_id', userId),
      // Delete profile last
      supabaseAdmin.from('users').delete().eq('id', userId)
    ]

    for (const operation of operations) {
      const { error } = await operation
      if (error) {
        console.error(`Error deleting user data for ${userId}:`, error)
      }
    }
  }
}

export const databaseAdmin = new DatabaseAdmin()

// Health check utilities
export class HealthCheck {
  async checkDatabase(): Promise<{ healthy: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        return { healthy: false, error: 'Supabase admin client not available - missing service role key' }
      }

      const { error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1)

      if (error) {
        return { healthy: false, error: error.message }
      }

      return { healthy: true }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async checkStorage(): Promise<{ healthy: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        return { healthy: false, error: 'Supabase admin client not available - missing service role key' }
      }

      const { data, error } = await supabaseAdmin.storage.listBuckets()

      if (error) {
        return { healthy: false, error: error.message }
      }

      // Check if required buckets exist
      const requiredBuckets = ['photos', 'avatars']
      const existingBuckets = data.map(bucket => bucket.id)
      const missingBuckets = requiredBuckets.filter(id => !existingBuckets.includes(id))

      if (missingBuckets.length > 0) {
        return {
          healthy: false,
          error: `Missing storage buckets: ${missingBuckets.join(', ')}`
        }
      }

      return { healthy: true }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async checkOverall() {
    const [database, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage()
    ])

    return {
      healthy: database.healthy && storage.healthy,
      database,
      storage
    }
  }
}

export const healthCheck = new HealthCheck()