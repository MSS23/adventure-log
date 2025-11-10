import { posthog } from './posthog'

/**
 * Track custom events throughout the app
 * These events help understand user behavior and feature usage
 */

// Album Events
export const trackAlbumCreated = (albumId: string, photoCount: number) => {
  posthog?.capture('album_created', {
    album_id: albumId,
    photo_count: photoCount,
  })
}

export const trackAlbumViewed = (albumId: string, isOwnAlbum: boolean) => {
  posthog?.capture('album_viewed', {
    album_id: albumId,
    is_own_album: isOwnAlbum,
  })
}

export const trackAlbumShared = (albumId: string, shareMethod: string) => {
  posthog?.capture('album_shared', {
    album_id: albumId,
    share_method: shareMethod,
  })
}

// Photo Events
export const trackPhotoUploaded = (albumId: string, hasExifData: boolean) => {
  posthog?.capture('photo_uploaded', {
    album_id: albumId,
    has_exif_data: hasExifData,
  })
}

// Social Events
export const trackUserFollowed = (followedUserId: string) => {
  posthog?.capture('user_followed', {
    followed_user_id: followedUserId,
  })
}

export const trackLikeAdded = (targetType: string, targetId: string) => {
  posthog?.capture('like_added', {
    target_type: targetType,
    target_id: targetId,
  })
}

export const trackCommentAdded = (targetType: string, targetId: string) => {
  posthog?.capture('comment_added', {
    target_type: targetType,
    target_id: targetId,
  })
}

// Story Events
export const trackStoryCreated = (storyId: string) => {
  posthog?.capture('story_created', {
    story_id: storyId,
  })
}

export const trackStoryViewed = (storyId: string) => {
  posthog?.capture('story_viewed', {
    story_id: storyId,
  })
}

// Globe Events
export const trackGlobeViewed = (viewType: 'own' | 'friend' | 'public') => {
  posthog?.capture('globe_viewed', {
    view_type: viewType,
  })
}

export const trackGlobeLocationClicked = (albumId: string) => {
  posthog?.capture('globe_location_clicked', {
    album_id: albumId,
  })
}

// Trip Planner Events
export const trackTripPlanGenerated = (country: string, region: string) => {
  posthog?.capture('trip_plan_generated', {
    country,
    region,
  })
}

export const trackTripPlanSaved = (planId: string) => {
  posthog?.capture('trip_plan_saved', {
    plan_id: planId,
  })
}

// Search Events
export const trackSearch = (query: string, resultsCount: number) => {
  posthog?.capture('search_performed', {
    query,
    results_count: resultsCount,
  })
}

// Profile Events
export const trackProfileUpdated = () => {
  posthog?.capture('profile_updated')
}

export const trackProfileViewed = (profileUserId: string, isOwnProfile: boolean) => {
  posthog?.capture('profile_viewed', {
    profile_user_id: profileUserId,
    is_own_profile: isOwnProfile,
  })
}

// Onboarding Events
export const trackSignupCompleted = (method: string) => {
  posthog?.capture('signup_completed', {
    method,
  })
}

export const trackOnboardingCompleted = () => {
  posthog?.capture('onboarding_completed')
}

// Feature Discovery Events
export const trackFeatureDiscovered = (featureName: string) => {
  posthog?.capture('feature_discovered', {
    feature_name: featureName,
  })
}

// Error Events
export const trackError = (errorType: string, errorMessage: string, context?: Record<string, any>) => {
  posthog?.capture('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  })
}
