'use client'

import { useReducer, useCallback } from 'react'
import {
  StoryWithStats,
  StoryViewerState,
  StoryViewerAction
} from '@/types/stories'

// State management for the story viewer
const initialState: StoryViewerState = {
  currentStoryIndex: 0,
  stories: [],
  isLoading: false,
  hasSubmittedGuess: false,
  selectedCountryCode: undefined,
  showResults: false,
  error: undefined
}

function storyViewerReducer(state: StoryViewerState, action: StoryViewerAction): StoryViewerState {
  switch (action.type) {
    case 'LOAD_STORIES':
      return {
        ...state,
        stories: action.payload,
        isLoading: false,
        error: undefined
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'NEXT_STORY':
      const nextIndex = Math.min(state.currentStoryIndex + 1, state.stories.length - 1)
      return {
        ...state,
        currentStoryIndex: nextIndex,
        hasSubmittedGuess: false,
        selectedCountryCode: undefined,
        showResults: false,
        error: undefined
      }

    case 'PREVIOUS_STORY':
      const prevIndex = Math.max(state.currentStoryIndex - 1, 0)
      return {
        ...state,
        currentStoryIndex: prevIndex,
        hasSubmittedGuess: false,
        selectedCountryCode: undefined,
        showResults: false,
        error: undefined
      }

    case 'SET_STORY_INDEX':
      return {
        ...state,
        currentStoryIndex: Math.max(0, Math.min(action.payload, state.stories.length - 1)),
        hasSubmittedGuess: false,
        selectedCountryCode: undefined,
        showResults: false,
        error: undefined
      }

    case 'SET_COUNTRY_GUESS':
      return {
        ...state,
        selectedCountryCode: action.payload,
        error: undefined
      }

    case 'SUBMIT_GUESS_START':
      return {
        ...state,
        isLoading: true,
        error: undefined
      }

    case 'SUBMIT_GUESS_SUCCESS':
      return {
        ...state,
        isLoading: false,
        hasSubmittedGuess: true,
        showResults: true,
        error: undefined
      }

    case 'SUBMIT_GUESS_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      }

    case 'SHOW_RESULTS':
      return {
        ...state,
        showResults: true
      }

    case 'RESET':
      return {
        ...initialState,
        stories: state.stories
      }

    default:
      return state
  }
}

/**
 * Hook for managing story viewer state and interactions
 */
export function useStoryViewer(stories: StoryWithStats[] = [], initialIndex: number = 0) {
  const [state, dispatch] = useReducer(storyViewerReducer, {
    ...initialState,
    stories,
    currentStoryIndex: initialIndex
  })

  // Derived state
  const currentStory = state.stories[state.currentStoryIndex]
  const canGoNext = state.currentStoryIndex < state.stories.length - 1
  const canGoPrevious = state.currentStoryIndex > 0
  const canGuess = currentStory?.can_guess && !currentStory.is_expired && !state.hasSubmittedGuess
  const shouldShowResults = state.showResults || currentStory?.is_expired || currentStory?.is_owner || !!currentStory?.user_guess

  // Actions
  const loadStories = useCallback((newStories: StoryWithStats[]) => {
    dispatch({ type: 'LOAD_STORIES', payload: newStories })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const nextStory = useCallback(() => {
    if (canGoNext) {
      dispatch({ type: 'NEXT_STORY' })
    }
  }, [canGoNext])

  const previousStory = useCallback(() => {
    if (canGoPrevious) {
      dispatch({ type: 'PREVIOUS_STORY' })
    }
  }, [canGoPrevious])

  const setStoryIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_STORY_INDEX', payload: index })
  }, [])

  const setCountryGuess = useCallback((countryCode: string | undefined) => {
    dispatch({ type: 'SET_COUNTRY_GUESS', payload: countryCode || '' })
  }, [])

  const startSubmitGuess = useCallback(() => {
    dispatch({ type: 'SUBMIT_GUESS_START' })
  }, [])

  const submitGuessSuccess = useCallback(() => {
    dispatch({ type: 'SUBMIT_GUESS_SUCCESS' })
  }, [])

  const submitGuessError = useCallback((error: string) => {
    dispatch({ type: 'SUBMIT_GUESS_ERROR', payload: error })
  }, [])

  const showResults = useCallback(() => {
    dispatch({ type: 'SHOW_RESULTS' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Helper functions
  const getCurrentStoryProgress = useCallback(() => {
    if (state.stories.length === 0) return 0
    return Math.round(((state.currentStoryIndex + 1) / state.stories.length) * 100)
  }, [state.currentStoryIndex, state.stories.length])

  const getTimeUntilExpiry = useCallback((story: StoryWithStats) => {
    const now = new Date()
    const expiry = new Date(story.expires_at)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else {
      return `${minutes}m left`
    }
  }, [])

  const isStoryInteractive = useCallback((story: StoryWithStats) => {
    return story.can_guess && !story.is_expired && !story.user_guess
  }, [])

  const getStoryStatus = useCallback((story: StoryWithStats) => {
    if (story.is_expired) return 'expired'
    if (story.is_owner) return 'owner'
    if (story.user_guess) return 'guessed'
    if (story.can_guess) return 'guessable'
    return 'viewable'
  }, [])

  return {
    // State
    state,
    currentStory,
    canGoNext,
    canGoPrevious,
    canGuess,
    shouldShowResults,

    // Actions
    loadStories,
    setLoading,
    nextStory,
    previousStory,
    setStoryIndex,
    setCountryGuess,
    startSubmitGuess,
    submitGuessSuccess,
    submitGuessError,
    showResults,
    reset,

    // Helpers
    getCurrentStoryProgress,
    getTimeUntilExpiry,
    isStoryInteractive,
    getStoryStatus
  }
}

/**
 * Hook for managing story viewer keyboard shortcuts
 */
export function useStoryViewerKeyboard(
  onNext: () => void,
  onPrevious: () => void,
  onClose: () => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        event.preventDefault()
        onNext()
        break
      case 'ArrowLeft':
        event.preventDefault()
        onPrevious()
        break
      case 'Escape':
        event.preventDefault()
        onClose()
        break
    }
  }, [enabled, onNext, onPrevious, onClose])

  return { handleKeyDown }
}

/**
 * Hook for managing story viewer touch gestures
 */
export function useStoryViewerGestures(
  onNext: () => void,
  onPrevious: () => void,
  onTap?: () => void
) {
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      return {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      }
    }
    return null
  }, [])

  const handleTouchEnd = useCallback((event: React.TouchEvent, touchStart: { startX: number; startY: number; startTime: number } | null) => {
    if (!touchStart) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStart.startX
    const deltaY = touch.clientY - touchStart.startY
    const deltaTime = Date.now() - touchStart.startTime

    // Swipe detection
    if (Math.abs(deltaX) > 50 && deltaTime < 300 && Math.abs(deltaY) < 100) {
      if (deltaX > 0) {
        onPrevious()
      } else {
        onNext()
      }
    }
    // Tap detection
    else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
      if (onTap) {
        onTap()
      }
    }
  }, [onNext, onPrevious, onTap])

  return { handleTouchStart, handleTouchEnd }
}