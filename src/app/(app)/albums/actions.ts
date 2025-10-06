'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  Album,
  AlbumPhoto,
  type CreateAlbumRequest,
  type UpdateAlbumRequest,
  type AddPhotosRequest,
  type AlbumListResponse
} from '@/types/database'
import { isValidCountryCode } from '@/lib/countries'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createAlbumSchema = z.object({
  title: z.string()
    .min(1, 'Album title is required')
    .max(200, 'Album title must be less than 200 characters'),
  caption: z.string()
    .max(2000, 'Caption must be less than 2000 characters')
    .optional(),
  privacy: z.enum(['public', 'friends', 'private']).default('private'),
  country_code: z.string()
    .length(2, 'Country code must be 2 characters')
    .optional()
    .refine((code) => !code || isValidCountryCode(code), 'Invalid country code')
})

const updateAlbumSchema = z.object({
  id: z.string().uuid('Invalid album ID'),
  title: z.string()
    .min(1, 'Album title is required')
    .max(200, 'Album title must be less than 200 characters')
    .optional(),
  caption: z.string()
    .max(2000, 'Caption must be less than 2000 characters')
    .optional(),
  privacy: z.enum(['public', 'friends', 'private']).optional(),
  country_code: z.string()
    .length(2, 'Country code must be 2 characters')
    .optional()
    .refine((code) => !code || isValidCountryCode(code), 'Invalid country code'),
  cover_image_url: z.string().url('Invalid image URL').optional()
})

const addPhotosSchema = z.object({
  album_id: z.string().uuid('Invalid album ID'),
  photos: z.array(z.object({
    storage_path: z.string().min(1, 'Storage path is required'),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    taken_at: z.string().datetime().optional()
  }))
})

// =============================================================================
// ALBUM CRUD ACTIONS
// =============================================================================

/**
 * Create a new album with privacy controls (DEPRECATED - use createAlbumWithPhotos)
 * @deprecated Use createAlbumWithPhotos to ensure albums always have photos
 */
export async function createAlbum(input: CreateAlbumRequest): Promise<{ success: boolean; album?: Album; error?: string }> {
  try {
    const validatedInput = createAlbumSchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Create album record
    const { data: album, error: insertError } = await supabase
      .from('albums')
      .insert({
        user_id: user.id,
        title: validatedInput.title,
        caption: validatedInput.caption || null,
        privacy: validatedInput.privacy,
        country_code: validatedInput.country_code || null
      })
      .select(`
        *,
        user:users!albums_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Failed to create album:', insertError)
      return { success: false, error: 'Failed to create album' }
    }

    // Revalidate relevant paths
    revalidatePath('/albums')
    revalidatePath('/dashboard')

    return { success: true, album }
  } catch (error) {
    console.error('Create album error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create album' }
  }
}

/**
 * Create a new album with photos (enforces albums must have photos)
 */
export async function createAlbumWithPhotos(
  albumInput: CreateAlbumRequest,
  photosInput: Array<{
    storage_path: string
    width?: number
    height?: number
    taken_at?: string
  }>
): Promise<{ success: boolean; album?: Album; error?: string }> {
  if (!photosInput || photosInput.length === 0) {
    return { success: false, error: 'Albums must have at least one photo' }
  }

  try {
    const validatedAlbumInput = createAlbumSchema.parse(albumInput)
    const validatedPhotosInput = z.array(z.object({
      storage_path: z.string().min(1, 'Storage path is required'),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      taken_at: z.string().datetime().optional()
    })).parse(photosInput)

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Start transaction by creating album
    const { data: album, error: insertError } = await supabase
      .from('albums')
      .insert({
        user_id: user.id,
        title: validatedAlbumInput.title,
        caption: validatedAlbumInput.caption || null,
        privacy: validatedAlbumInput.privacy,
        country_code: validatedAlbumInput.country_code || null
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Failed to create album:', insertError)
      return { success: false, error: 'Failed to create album' }
    }

    // Add photos to the album
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .insert(
        validatedPhotosInput.map((photo, index) => ({
          user_id: user.id,
          album_id: album.id,
          storage_path: photo.storage_path,
          taken_at: photo.taken_at || null,
          order_index: index,
          is_favorite: false
        }))
      )
      .select()

    if (photosError) {
      console.error('Failed to add photos:', photosError)
      // Rollback: delete the album if photo insertion failed
      await supabase.from('albums').delete().eq('id', album.id)
      return { success: false, error: 'Failed to add photos to album' }
    }

    // Set cover photo from first photo if not already set
    if (photos.length > 0 && !album.cover_photo_id) {
      await supabase
        .from('albums')
        .update({ cover_photo_id: photos[0].id })
        .eq('id', album.id)
    }

    // Get the complete album with user and photos
    const { data: completeAlbum, error: fetchError } = await supabase
      .from('albums')
      .select(`
        *,
        user:users!albums_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        photos:photos!album_id (
          id,
          storage_path,
          caption,
          taken_at,
          order_index,
          is_favorite,
          created_at
        )
      `)
      .eq('id', album.id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch complete album:', fetchError)
      return { success: false, error: 'Album created but failed to fetch details' }
    }

    // Revalidate relevant paths
    revalidatePath('/albums')
    revalidatePath('/dashboard')

    return { success: true, album: completeAlbum }
  } catch (error) {
    console.error('Create album with photos error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create album with photos' }
  }
}

/**
 * Update an existing album
 */
export async function updateAlbum(input: UpdateAlbumRequest): Promise<{ success: boolean; album?: Album; error?: string }> {
  try {
    const validatedInput = updateAlbumSchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Build update object (only include defined fields)
    const updateData: Record<string, unknown> = {}
    if (validatedInput.title !== undefined) updateData.title = validatedInput.title
    if (validatedInput.caption !== undefined) updateData.caption = validatedInput.caption
    if (validatedInput.privacy !== undefined) updateData.privacy = validatedInput.privacy
    if (validatedInput.country_code !== undefined) updateData.country_code = validatedInput.country_code
    if (validatedInput.cover_image_url !== undefined) updateData.cover_image_url = validatedInput.cover_image_url

    // Update album (RLS will enforce ownership)
    const { data: album, error: updateError } = await supabase
      .from('albums')
      .update(updateData)
      .eq('id', validatedInput.id)
      .select(`
        *,
        user:users!albums_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        photos:photos!album_id (
          id,
          storage_path,
          caption,
          taken_at,
          order_index,
          is_favorite,
          created_at
        )
      `)
      .single()

    if (updateError) {
      console.error('Failed to update album:', updateError)
      return { success: false, error: 'Failed to update album' }
    }

    // Revalidate relevant paths
    revalidatePath(`/albums/${validatedInput.id}`)
    revalidatePath('/albums')

    return { success: true, album }
  } catch (error) {
    console.error('Update album error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to update album' }
  }
}

/**
 * Delete an album and all its photos
 */
export async function deleteAlbum(albumId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Delete album (RLS will enforce ownership, cascade will handle photos and stories)
    const { error: deleteError } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId)

    if (deleteError) {
      console.error('Failed to delete album:', deleteError)
      return { success: false, error: 'Failed to delete album' }
    }

    // Revalidate and redirect
    revalidatePath('/albums')
    revalidatePath('/dashboard')
    redirect('/albums')
  } catch (error) {
    console.error('Delete album error:', error)
    return { success: false, error: 'Failed to delete album' }
  }
}

/**
 * Add photos to an album
 */
export async function addPhotos(input: AddPhotosRequest): Promise<{ success: boolean; photos?: AlbumPhoto[]; error?: string }> {
  try {
    const validatedInput = addPhotosSchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify album ownership
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', validatedInput.album_id)
      .single()

    if (albumError || !album) {
      return { success: false, error: 'Album not found' }
    }

    if (album.user_id !== user.id) {
      return { success: false, error: 'Not authorized to add photos to this album' }
    }

    // Insert photo records
    const { data: photos, error: insertError } = await supabase
      .from('album_photos')
      .insert(
        validatedInput.photos.map(photo => ({
          album_id: validatedInput.album_id,
          storage_path: photo.storage_path,
          width: photo.width || null,
          height: photo.height || null,
          taken_at: photo.taken_at || null
        }))
      )
      .select()

    if (insertError) {
      console.error('Failed to add photos:', insertError)
      return { success: false, error: 'Failed to add photos' }
    }

    // Update album cover image if it doesn't have one and photos were added
    if (photos.length > 0) {
      const { data: currentAlbum } = await supabase
        .from('albums')
        .select('cover_photo_url')
        .eq('id', validatedInput.album_id)
        .single()

      if (currentAlbum && !currentAlbum.cover_photo_url) {
        await supabase
          .from('albums')
          .update({ cover_photo_url: photos[0].storage_path })
          .eq('id', validatedInput.album_id)
      }
    }

    // Revalidate relevant paths
    revalidatePath(`/albums/${validatedInput.album_id}`)
    revalidatePath('/albums')

    return { success: true, photos }
  } catch (error) {
    console.error('Add photos error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to add photos' }
  }
}

/**
 * Get signed upload URLs for photos
 */
export async function getUploadUrls(albumId: string, fileNames: string[]): Promise<{ success: boolean; urls?: { fileName: string; uploadUrl: string; storagePath: string }[]; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify album ownership
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      return { success: false, error: 'Album not found' }
    }

    if (album.user_id !== user.id) {
      return { success: false, error: 'Not authorized to upload to this album' }
    }

    // Generate signed upload URLs
    const urls = await Promise.all(
      fileNames.map(async (fileName) => {
        const fileExt = fileName.split('.').pop()
        const uniqueFileName = `${user.id}/${albumId}/${crypto.randomUUID()}.${fileExt}`
        const storagePath = `photos/${uniqueFileName}`

        const { data: urlData, error: urlError } = await supabase.storage
          .from('photos')
          .createSignedUploadUrl(uniqueFileName)

        if (urlError) {
          throw new Error(`Failed to generate upload URL for ${fileName}`)
        }

        return {
          fileName,
          uploadUrl: urlData.signedUrl,
          storagePath
        }
      })
    )

    return { success: true, urls }
  } catch (error) {
    console.error('Get upload URLs error:', error)
    return { success: false, error: 'Failed to generate upload URLs' }
  }
}

/**
 * List visible albums with pagination
 */
export async function listVisibleAlbums(
  cursor?: string,
  limit: number = 20,
  userId?: string
): Promise<{ success: boolean; data?: AlbumListResponse; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    let query = supabase
      .from('albums')
      .select(`
        *,
        user:users!albums_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        photos:photos!album_id (
          id,
          storage_path,
          caption,
          taken_at,
          order_index,
          is_favorite,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Get one extra to check if there are more

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply cursor pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: albums, error: queryError } = await query

    if (queryError) {
      console.error('Failed to list albums:', queryError)
      return { success: false, error: 'Failed to load albums' }
    }

    // Determine if there are more results
    const hasMore = albums.length > limit
    const albumList = hasMore ? albums.slice(0, -1) : albums
    const nextCursor = hasMore && albumList.length > 0 ? albumList[albumList.length - 1].created_at : undefined

    return {
      success: true,
      data: {
        albums: albumList,
        cursor: nextCursor,
        has_more: hasMore
      }
    }
  } catch (error) {
    console.error('List albums error:', error)
    return { success: false, error: 'Failed to load albums' }
  }
}

/**
 * Get a single album by ID
 */
export async function getAlbum(albumId: string): Promise<{ success: boolean; album?: Album; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { data: album, error: queryError } = await supabase
      .from('albums')
      .select(`
        *,
        user:users!albums_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        photos:photos!album_id (
          id,
          storage_path,
          caption,
          taken_at,
          order_index,
          is_favorite,
          created_at
        )
      `)
      .eq('id', albumId)
      .single()

    if (queryError) {
      console.error('Failed to get album:', queryError)
      return { success: false, error: 'Album not found' }
    }

    return { success: true, album }
  } catch (error) {
    console.error('Get album error:', error)
    return { success: false, error: 'Failed to load album' }
  }
}

/**
 * Clean up orphaned albums (albums without photos)
 * Should be called periodically or manually when needed
 */
export async function cleanupOrphanedAlbums(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user (admin check could be added here)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Call the cleanup function we created in SQL
    const { data, error } = await supabase.rpc('cleanup_orphaned_albums')

    if (error) {
      console.error('Failed to cleanup orphaned albums:', error)
      return { success: false, error: 'Failed to cleanup orphaned albums' }
    }

    // Revalidate paths after cleanup
    revalidatePath('/albums')
    revalidatePath('/dashboard')

    return { success: true, deletedCount: data || 0 }
  } catch (error) {
    console.error('Cleanup orphaned albums error:', error)
    return { success: false, error: 'Failed to cleanup orphaned albums' }
  }
}

/**
 * Get list of orphaned albums (for debugging/monitoring)
 */
export async function getOrphanedAlbums(): Promise<{ success: boolean; orphanedAlbums?: Array<{album_id: string, album_title: string, created_at: string}>; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Call the function we created in SQL
    const { data, error } = await supabase.rpc('get_orphaned_albums')

    if (error) {
      console.error('Failed to get orphaned albums:', error)
      return { success: false, error: 'Failed to get orphaned albums' }
    }

    return { success: true, orphanedAlbums: data || [] }
  } catch (error) {
    console.error('Get orphaned albums error:', error)
    return { success: false, error: 'Failed to get orphaned albums' }
  }
}

/**
 * Check if a photo can be deleted (not the last photo in album)
 */
export async function canDeletePhoto(photoId: string): Promise<{ success: boolean; canDelete?: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Call the function we created in SQL
    const { data, error } = await supabase.rpc('can_delete_photo', {
      p_user_id: user.id,
      p_photo_id: photoId
    })

    if (error) {
      console.error('Failed to check if photo can be deleted:', error)
      return { success: false, error: 'Failed to check photo deletion permission' }
    }

    return { success: true, canDelete: data || false }
  } catch (error) {
    console.error('Check photo deletion error:', error)
    return { success: false, error: 'Failed to check photo deletion permission' }
  }
}

/**
 * Delete a photo from an album
 */
export async function deletePhoto(photoId: string): Promise<{ success: boolean; message?: string; remainingPhotos?: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Call the function we created in SQL
    const { data, error } = await supabase.rpc('delete_photo_from_album', {
      p_user_id: user.id,
      p_photo_id: photoId
    })

    if (error) {
      console.error('Failed to delete photo:', error)
      return { success: false, error: 'Failed to delete photo' }
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'No data returned from photo deletion' }
    }

    const result = data[0]

    if (!result.success) {
      return { 
        success: false, 
        error: result.message || 'Failed to delete photo',
        remainingPhotos: result.remaining_photos
      }
    }

    // Revalidate relevant paths
    revalidatePath('/albums')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      message: result.message,
      remainingPhotos: result.remaining_photos
    }
  } catch (error) {
    console.error('Delete photo error:', error)
    return { success: false, error: 'Failed to delete photo' }
  }
}