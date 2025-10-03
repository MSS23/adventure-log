'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import {
  Story,
  StoryStats,
  StoryGuess,
  StoryWithStats,
  StoryFeedItem,
  type CreateStoryRequest,
  type GuessStoryRequest,
  type StoryFeedResponse
} from '@/types/database'
import { isValidCountryCode } from '@/lib/countries'

// =============================================================================
// TYPES FOR SUPABASE QUERIES
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoryQueryResult = any

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createStorySchema = z.object({
  album_id: z.string().uuid('Invalid album ID'),
  image_url: z.string().url('Invalid image URL').optional()
})

const guessStorySchema = z.object({
  story_id: z.string().uuid('Invalid story ID'),
  guess_code: z.string()
    .length(2, 'Country code must be 2 characters')
    .refine((code) => isValidCountryCode(code), 'Invalid country code')
})

// =============================================================================
// STORY ACTIONS
// =============================================================================

/**
 * Create a new story from an album
 */
export async function createStory(input: CreateStoryRequest): Promise<{ success: boolean; story?: Story; error?: string }> {
  try {
    const validatedInput = createStorySchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get album details and verify ownership
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, user_id, title, privacy, country_code, cover_image_url')
      .eq('id', validatedInput.album_id)
      .single()

    if (albumError || !album) {
      return { success: false, error: 'Album not found' }
    }

    if (album.user_id !== user.id) {
      return { success: false, error: 'Not authorized to create story from this album' }
    }

    // Validate album has country code for guessing game
    if (!album.country_code) {
      return { success: false, error: 'Album must have a country selected to create a story' }
    }

    // Use provided image URL or fall back to album cover
    const imageUrl = validatedInput.image_url || album.cover_image_url
    if (!imageUrl) {
      return { success: false, error: 'Album must have a cover image to create a story' }
    }

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create story record
    const { data: story, error: insertError } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        album_id: album.id,
        image_url: imageUrl,
        country_code: album.country_code,
        privacy_snapshot: album.privacy, // Freeze privacy at creation time
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        album:albums!stories_album_id_fkey (
          id,
          title,
          country_code
        ),
        user:profiles!stories_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Failed to create story:', insertError)
      return { success: false, error: 'Failed to create story' }
    }

    // Revalidate relevant paths
    revalidatePath('/stories')
    revalidatePath('/dashboard')
    revalidatePath(`/albums/${album.id}`)

    return { success: true, story }
  } catch (error) {
    console.error('Create story error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create story' }
  }
}

/**
 * Get story feed with pagination (excludes user's own stories for guessing)
 */
export async function getStoryFeed(
  cursor?: string,
  limit: number = 20,
  includeOwn: boolean = false
): Promise<{ success: boolean; data?: StoryFeedResponse; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    let query = supabase
      .from('stories')
      .select(`
        id,
        user_id,
        image_url,
        expires_at,
        created_at,
        user:profiles!stories_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .gt('expires_at', new Date().toISOString()) // Only non-expired stories
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Get one extra to check if there are more

    // Exclude own stories unless specifically requested
    if (!includeOwn) {
      query = query.neq('user_id', user.id)
    }

    // Apply cursor pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: stories, error: queryError } = await query

    if (queryError) {
      console.error('Failed to get story feed:', queryError)
      return { success: false, error: 'Failed to load stories' }
    }

    // Transform to feed items and determine pagination
    const hasMore = stories.length > limit
    const storyList = hasMore ? stories.slice(0, -1) : stories
    const nextCursor = hasMore && storyList.length > 0 ? storyList[storyList.length - 1].created_at : undefined

    const feedItems: StoryFeedItem[] = storyList.map((story: StoryQueryResult) => ({
      id: story.id,
      user_id: story.user_id,
      album_id: story.album_id || '',
      media_url: story.image_url || story.media_url || '',
      image_url: story.image_url,
      country_code: story.country_code || '',
      expires_at: story.expires_at,
      created_at: story.created_at,
      stats: undefined,
      is_owner: story.user_id === user.id,
      has_viewed: false,
      user: story.user ? {
        id: story.user.id,
        email: story.user.email || '',
        username: story.user.username,
        display_name: story.user.display_name,
        avatar_url: story.user.avatar_url,
        is_private: story.user.is_private || false,
        created_at: story.user.created_at || new Date().toISOString(),
        updated_at: story.user.updated_at || new Date().toISOString()
      } : undefined
    }))

    return {
      success: true,
      data: {
        stories: feedItems,
        cursor: nextCursor,
        has_more: hasMore
      }
    }
  } catch (error) {
    console.error('Story feed error:', error)
    return { success: false, error: 'Failed to load stories' }
  }
}

/**
 * Submit a guess for a story
 */
export async function guessStory(input: GuessStoryRequest): Promise<{ success: boolean; guess?: StoryGuess; error?: string }> {
  try {
    const validatedInput = guessStorySchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if story exists and user can view it
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, user_id, expires_at, country_code')
      .eq('id', validatedInput.story_id)
      .single()

    if (storyError || !story) {
      return { success: false, error: 'Story not found' }
    }

    // Validate story conditions
    if (story.user_id === user.id) {
      return { success: false, error: 'Cannot guess on your own story' }
    }

    if (new Date(story.expires_at) <= new Date()) {
      return { success: false, error: 'Story has expired' }
    }

    // Note: upsert will handle duplicate guesses automatically

    // Insert or update guess (idempotent)
    const { data: guess, error: upsertError } = await supabase
      .from('story_guesses')
      .upsert({
        story_id: validatedInput.story_id,
        user_id: user.id,
        guess_code: validatedInput.guess_code.toUpperCase()
      })
      .select(`
        *,
        user:profiles!story_guesses_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single()

    if (upsertError) {
      console.error('Failed to submit guess:', upsertError)
      return { success: false, error: 'Failed to submit guess' }
    }

    // Revalidate story-related paths
    revalidatePath('/stories')
    revalidatePath(`/stories/${validatedInput.story_id}`)

    return {
      success: true,
      guess,
      error: undefined // Clear error to show success message
    }
  } catch (error) {
    console.error('Guess story error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to submit guess' }
  }
}

/**
 * Get story statistics (owner only)
 */
export async function getStoryStats(storyId: string): Promise<{ success: boolean; stats?: StoryStats; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get stats from the view (includes ownership check via RLS)
    const { data: stats, error: statsError } = await supabase
      .from('story_stats')
      .select('*')
      .eq('story_id', storyId)
      .single()

    if (statsError) {
      console.error('Failed to get story stats:', statsError)
      return { success: false, error: 'Failed to load story statistics' }
    }

    return { success: true, stats }
  } catch (error) {
    console.error('Story stats error:', error)
    return { success: false, error: 'Failed to load story statistics' }
  }
}

/**
 * Get a single story with all details for viewing
 */
export async function getStoryWithStats(storyId: string): Promise<{ success: boolean; story?: StoryWithStats; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get story details
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select(`
        *,
        album:albums!stories_album_id_fkey (
          id,
          title,
          country_code
        ),
        user:profiles!stories_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', storyId)
      .single()

    if (storyError || !story) {
      return { success: false, error: 'Story not found' }
    }

    const isOwner = story.user_id === user.id
    const isExpired = new Date(story.expires_at) <= new Date()

    // Get user's guess if they have one
    let userGuess: StoryGuess | undefined
    if (!isOwner) {
      const { data: guess } = await supabase
        .from('story_guesses')
        .select(`
          *,
          user:profiles!story_guesses_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .single()

      userGuess = guess || undefined
    }

    // Get stats if user is owner or story is expired
    let stats: StoryStats | undefined
    if (isOwner || isExpired) {
      const { data: statsData } = await supabase
        .from('story_stats')
        .select('*')
        .eq('story_id', storyId)
        .single()

      stats = statsData || undefined
    }

    const storyWithStats: StoryWithStats = {
      ...story,
      stats,
      user_guess: userGuess,
      is_expired: isExpired,
      is_owner: isOwner,
      can_view: true, // If we got here, RLS allowed it
      can_guess: !isOwner && !isExpired && !userGuess
    }

    return { success: true, story: storyWithStats }
  } catch (error) {
    console.error('Get story with stats error:', error)
    return { success: false, error: 'Failed to load story' }
  }
}

/**
 * Delete a story (owner only)
 */
export async function deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Delete story (RLS will enforce ownership)
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)

    if (deleteError) {
      console.error('Failed to delete story:', deleteError)
      return { success: false, error: 'Failed to delete story' }
    }

    // Revalidate relevant paths
    revalidatePath('/stories')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Delete story error:', error)
    return { success: false, error: 'Failed to delete story' }
  }
}

/**
 * Get stories by user (for profile viewing)
 */
export async function getUserStories(
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ success: boolean; data?: StoryFeedResponse; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    let query = supabase
      .from('stories')
      .select(`
        id,
        user_id,
        image_url,
        expires_at,
        created_at,
        user:profiles!stories_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString()) // Only non-expired stories
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    // Apply cursor pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: stories, error: queryError } = await query

    if (queryError) {
      console.error('Failed to get user stories:', queryError)
      return { success: false, error: 'Failed to load stories' }
    }

    // Transform to feed items and determine pagination
    const hasMore = stories.length > limit
    const storyList = hasMore ? stories.slice(0, -1) : stories
    const nextCursor = hasMore && storyList.length > 0 ? storyList[storyList.length - 1].created_at : undefined

    const feedItems: StoryFeedItem[] = storyList.map((story: StoryQueryResult) => ({
      id: story.id,
      user_id: story.user_id,
      album_id: story.album_id || '',
      media_url: story.image_url || story.media_url || '',
      image_url: story.image_url,
      country_code: story.country_code || '',
      expires_at: story.expires_at,
      created_at: story.created_at,
      stats: undefined,
      is_owner: story.user_id === user.id,
      has_viewed: false,
      user: story.user ? {
        id: story.user.id,
        email: story.user.email || '',
        username: story.user.username,
        display_name: story.user.display_name,
        avatar_url: story.user.avatar_url,
        is_private: story.user.is_private || false,
        created_at: story.user.created_at || new Date().toISOString(),
        updated_at: story.user.updated_at || new Date().toISOString()
      } : undefined
    }))

    return {
      success: true,
      data: {
        stories: feedItems,
        cursor: nextCursor,
        has_more: hasMore
      }
    }
  } catch (error) {
    console.error('Get user stories error:', error)
    return { success: false, error: 'Failed to load user stories' }
  }
}