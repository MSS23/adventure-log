'use client'

import { useRef, useEffect } from 'react'
import type { TravelLocation } from '@/lib/hooks/useTravelTimeline'
import type { CityCluster } from '../CityPinSystem'

interface UseGlobeKeyboardParams {
  locations: TravelLocation[]
  effectiveSelectedYear: number | null
  availableYears: number[]
  progressionMode: 'auto' | 'manual'
  isJourneyPaused: boolean
  showSearch: boolean
  handlePlayPause: () => void
  handleReset: () => void
  handleYearChange: (year: number) => void
  toggleProgressionMode: () => void
  advanceToNextLocation: () => void
  goToPreviousLocation: () => void
  resumeJourney: () => void
  navigateToNextAlbumRef: React.MutableRefObject<() => void>
  navigateToPreviousAlbumRef: React.MutableRefObject<() => void>
  showCurrentAlbumRef: React.MutableRefObject<() => void>
  currentAlbumRef: React.MutableRefObject<{ albumId: string } | null>
  chronologicalAlbumsRef: React.MutableRefObject<Array<{ albumId: string }>>
  setShowSearch: (show: boolean) => void
  setShowAlbumModal: (show: boolean) => void
  setSelectedCluster: (cluster: CityCluster | null) => void
}

export function useGlobeKeyboard(params: UseGlobeKeyboardParams): void {
  const {
    handlePlayPause,
    handleReset,
    handleYearChange,
    toggleProgressionMode,
    advanceToNextLocation,
    goToPreviousLocation,
    resumeJourney,
    navigateToNextAlbumRef,
    navigateToPreviousAlbumRef,
    showCurrentAlbumRef,
    currentAlbumRef,
    chronologicalAlbumsRef,
    setShowSearch,
    setShowAlbumModal,
    setSelectedCluster,
  } = params

  // Stable refs for keyboard shortcuts
  const showSearchRef = useRef(params.showSearch)
  const selectedYearRef = useRef(params.effectiveSelectedYear)
  const availableYearsRef = useRef(params.availableYears)
  const progressionModeRef = useRef(params.progressionMode)
  const isJourneyPausedRef = useRef(params.isJourneyPaused)
  const locationsRef = useRef(params.locations)

  // Update refs when values change
  useEffect(() => {
    showSearchRef.current = params.showSearch
    selectedYearRef.current = params.effectiveSelectedYear
    availableYearsRef.current = params.availableYears
    progressionModeRef.current = params.progressionMode
    isJourneyPausedRef.current = params.isJourneyPaused
    locationsRef.current = params.locations
  }, [params.showSearch, params.effectiveSelectedYear, params.availableYears, params.progressionMode, params.isJourneyPaused, params.locations])

  // Keyboard shortcuts with passive listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toLowerCase()

      if (key.length > 1 && !['escape', 'arrowleft', 'arrowright', 'space'].includes(key)) {
        return
      }

      switch (key) {
        case ' ':
          event.preventDefault()
          if (locationsRef.current.length > 1) {
            handlePlayPause()
          } else if (locationsRef.current.length === 1) {
            const location = locationsRef.current[0]
            const locationPhotos = location.photos || []

            const cluster: CityCluster = {
              id: `single-${location.id}-${Date.now()}`,
              latitude: location.latitude,
              longitude: location.longitude,
              cities: [{
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                albumCount: location.albums.length,
                photoCount: locationPhotos.length,
                visitDate: location.visitDate.toISOString(),
                isVisited: true,
                isActive: true,
                favoritePhotoUrls: location.albums[0]?.favoritePhotoUrls || [],
                coverPhotoUrl: location.albums[0]?.coverPhotoUrl,
                previewPhotoUrls: locationPhotos.map(p => p.url).filter((url): url is string => !!url)
              }],
              totalAlbums: location.albums.length,
              totalPhotos: locationPhotos.length,
              radius: 1
            }
            setSelectedCluster(cluster)
            setShowAlbumModal(true)
          }
          break
        case 'r':
          event.preventDefault()
          handleReset()
          break
        case 's':
          event.preventDefault()
          setShowSearch(!showSearchRef.current)
          break
        case 'escape':
          event.preventDefault()
          setShowSearch(false)
          setShowAlbumModal(false)
          break
        case 'm':
          event.preventDefault()
          if (locationsRef.current.length > 1) {
            toggleProgressionMode()
          }
          break
        case 'arrowleft':
          event.preventDefault()
          if (selectedYearRef.current && availableYearsRef.current.length > 0) {
            const currentIndex = availableYearsRef.current.indexOf(selectedYearRef.current)
            if (currentIndex > 0) {
              handleYearChange(availableYearsRef.current[currentIndex - 1])
            }
          }
          break
        case 'arrowright':
          event.preventDefault()
          if (selectedYearRef.current && availableYearsRef.current.length > 0) {
            const currentIndex = availableYearsRef.current.indexOf(selectedYearRef.current)
            if (currentIndex < availableYearsRef.current.length - 1) {
              handleYearChange(availableYearsRef.current[currentIndex + 1])
            }
          }
          break
        case 'n':
          event.preventDefault()
          if (chronologicalAlbumsRef.current.length > 0) {
            navigateToNextAlbumRef.current()
          }
          break
        case 'p':
          event.preventDefault()
          if (chronologicalAlbumsRef.current.length > 0) {
            navigateToPreviousAlbumRef.current()
          }
          break
        case 'a':
          event.preventDefault()
          if (currentAlbumRef.current) {
            showCurrentAlbumRef.current()
          }
          break
        case '.':
          event.preventDefault()
          if (progressionModeRef.current === 'manual' && locationsRef.current.length > 1) {
            advanceToNextLocation()
          }
          break
        case ',':
          event.preventDefault()
          if (progressionModeRef.current === 'manual' && locationsRef.current.length > 1) {
            goToPreviousLocation()
          }
          break
        case 'c':
          event.preventDefault()
          if (isJourneyPausedRef.current && progressionModeRef.current === 'manual') {
            resumeJourney()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePlayPause, handleReset, handleYearChange, toggleProgressionMode, advanceToNextLocation, goToPreviousLocation, resumeJourney, navigateToNextAlbumRef, navigateToPreviousAlbumRef, showCurrentAlbumRef, currentAlbumRef, chronologicalAlbumsRef, setShowSearch, setShowAlbumModal, setSelectedCluster])
}
