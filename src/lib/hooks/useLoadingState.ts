/**
 * Standardized loading state management for forms and async operations
 * Provides consistent loading indicators and state management
 */

import { useState, useCallback, useRef } from 'react'
import { log } from '@/lib/utils/logger'

export interface LoadingState {
  isLoading: boolean
  loadingText: string
  progress?: number
  stage?: string
}

export interface LoadingOptions {
  initialText?: string
  trackProgress?: boolean
  logContext?: {
    component: string
    action: string
    [key: string]: unknown
  }
}

export interface LoadingStage {
  key: string
  text: string
  weight: number // relative weight for progress calculation
}

export class LoadingManager {
  private stages: LoadingStage[] = []
  private currentStageIndex = 0
  private onUpdate: (state: LoadingState) => void
  private startTime: number = 0
  private logContext?: LoadingOptions['logContext']

  constructor(onUpdate: (state: LoadingState) => void, options?: LoadingOptions) {
    this.onUpdate = onUpdate
    this.logContext = options?.logContext
  }

  setStages(stages: LoadingStage[]) {
    this.stages = stages
    this.currentStageIndex = 0
  }

  start(text?: string) {
    this.startTime = Date.now()
    this.currentStageIndex = 0

    if (this.logContext) {
      log.debug(`Loading started: ${text || 'Unknown operation'}`, this.logContext)
    }

    this.updateState({
      isLoading: true,
      loadingText: text || 'Loading...',
      progress: this.stages.length > 0 ? 0 : undefined,
      stage: this.stages[0]?.key
    })
  }

  nextStage(customText?: string) {
    if (this.currentStageIndex < this.stages.length - 1) {
      this.currentStageIndex++
      const currentStage = this.stages[this.currentStageIndex]

      this.updateState({
        isLoading: true,
        loadingText: customText || currentStage.text,
        progress: this.calculateProgress(),
        stage: currentStage.key
      })
    }
  }

  updateProgress(text?: string, progress?: number) {
    this.updateState({
      isLoading: true,
      loadingText: text || this.getCurrentStageText(),
      progress: progress ?? this.calculateProgress(),
      stage: this.getCurrentStage()?.key
    })
  }

  complete(successText?: string) {
    const duration = Date.now() - this.startTime

    if (this.logContext) {
      log.performance('Loading completed', duration, this.logContext)
    }

    if (successText) {
      this.updateState({
        isLoading: false,
        loadingText: successText,
        progress: 100,
        stage: 'complete'
      })

      // Clear success message after delay
      setTimeout(() => {
        this.updateState({
          isLoading: false,
          loadingText: '',
          progress: undefined,
          stage: undefined
        })
      }, 2000)
    } else {
      this.updateState({
        isLoading: false,
        loadingText: '',
        progress: undefined,
        stage: undefined
      })
    }
  }

  error(errorText: string) {
    const duration = Date.now() - this.startTime

    if (this.logContext) {
      log.warn(`Loading failed after ${duration}ms`, this.logContext)
    }

    this.updateState({
      isLoading: false,
      loadingText: errorText,
      progress: undefined,
      stage: 'error'
    })
  }

  private calculateProgress(): number {
    if (this.stages.length === 0) return 0

    const totalWeight = this.stages.reduce((sum, stage) => sum + stage.weight, 0)
    let completedWeight = 0

    for (let i = 0; i < this.currentStageIndex; i++) {
      completedWeight += this.stages[i].weight
    }

    return Math.round((completedWeight / totalWeight) * 100)
  }

  private getCurrentStage(): LoadingStage | undefined {
    return this.stages[this.currentStageIndex]
  }

  private getCurrentStageText(): string {
    return this.getCurrentStage()?.text || 'Loading...'
  }

  private updateState(state: LoadingState) {
    this.onUpdate(state)
  }
}

export function useLoadingState(options?: LoadingOptions) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingText: options?.initialText || ''
  })

  const managerRef = useRef<LoadingManager | null>(null)

  if (!managerRef.current) {
    managerRef.current = new LoadingManager(setLoadingState, options)
  }

  const startLoading = useCallback((text?: string, stages?: LoadingStage[]) => {
    if (stages) {
      managerRef.current!.setStages(stages)
    }
    managerRef.current!.start(text)
  }, [])

  const nextStage = useCallback((text?: string) => {
    managerRef.current!.nextStage(text)
  }, [])

  const updateProgress = useCallback((text?: string, progress?: number) => {
    managerRef.current!.updateProgress(text, progress)
  }, [])

  const completeLoading = useCallback((successText?: string) => {
    managerRef.current!.complete(successText)
  }, [])

  const errorLoading = useCallback((errorText: string) => {
    managerRef.current!.error(errorText)
  }, [])

  return {
    ...loadingState,
    startLoading,
    nextStage,
    updateProgress,
    completeLoading,
    errorLoading
  }
}

// Common loading stage configurations
export const LOADING_STAGES = {
  FILE_UPLOAD: [
    { key: 'preparing', text: 'Preparing files...', weight: 10 },
    { key: 'uploading', text: 'Uploading files...', weight: 70 },
    { key: 'processing', text: 'Processing uploads...', weight: 15 },
    { key: 'finalizing', text: 'Finalizing...', weight: 5 }
  ],

  ALBUM_CREATION: [
    { key: 'validating', text: 'Validating data...', weight: 10 },
    { key: 'creating', text: 'Creating album...', weight: 30 },
    { key: 'uploading', text: 'Uploading photos...', weight: 50 },
    { key: 'finalizing', text: 'Finalizing album...', weight: 10 }
  ],

  DATA_FETCH: [
    { key: 'fetching', text: 'Fetching data...', weight: 60 },
    { key: 'processing', text: 'Processing results...', weight: 30 },
    { key: 'finalizing', text: 'Almost done...', weight: 10 }
  ],

  FORM_SUBMISSION: [
    { key: 'validating', text: 'Validating form...', weight: 20 },
    { key: 'submitting', text: 'Submitting data...', weight: 60 },
    { key: 'processing', text: 'Processing response...', weight: 20 }
  ],

  AUTHENTICATION: [
    { key: 'verifying', text: 'Verifying credentials...', weight: 40 },
    { key: 'loading', text: 'Loading profile...', weight: 40 },
    { key: 'redirecting', text: 'Redirecting...', weight: 20 }
  ]
}

// Hook for simple boolean loading state
export function useSimpleLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingText?: string
  ): Promise<T> => {
    setIsLoading(true)
    try {
      return await operation()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    setIsLoading,
    withLoading
  }
}