/**
 * Accessibility utilities for Adventure Log
 * Provides consistent accessibility patterns and helpers
 */

import { useEffect, useRef, useCallback } from 'react'

// ARIA live region utilities
export const ARIA_LIVE_REGIONS = {
  POLITE: 'polite' as const,
  ASSERTIVE: 'assertive' as const,
  OFF: 'off' as const
}

// Common ARIA roles
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  DIALOG: 'dialog',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  ALERT: 'alert',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
  SEARCHBOX: 'searchbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  GROUP: 'group',
  REGION: 'region',
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo'
} as const

// Screen reader text utilities
export function generateId(prefix: string = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export function createAriaLabel(text: string, context?: string): string {
  return context ? `${text}, ${context}` : text
}

export function createAriaDescription(description: string, additionalInfo?: string): string {
  return additionalInfo ? `${description}. ${additionalInfo}` : description
}

// Focus management utilities
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ')

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors))
  }

  static getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container)
    return elements.length > 0 ? elements[0] : null
  }

  static getLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container)
    return elements.length > 0 ? elements[elements.length - 1] : null
  }

  static trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return

    const focusableElements = this.getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  static restoreFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      // Use requestAnimationFrame to ensure the element is ready to receive focus
      requestAnimationFrame(() => {
        element.focus()
      })
    }
  }
}

// Hook for managing focus on mount/unmount
export function useFocusOnMount(shouldFocus: boolean = true, selector?: string) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!shouldFocus) return

    const element = elementRef.current
    if (!element) return

    const focusTarget = selector
      ? element.querySelector(selector) as HTMLElement
      : FocusManager.getFirstFocusableElement(element)

    if (focusTarget) {
      FocusManager.restoreFocus(focusTarget)
    }
  }, [shouldFocus, selector])

  return elementRef
}

// Hook for focus trap management
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Focus the first focusable element in the container
    const firstFocusable = FocusManager.getFirstFocusableElement(container)
    if (firstFocusable) {
      FocusManager.restoreFocus(firstFocusable)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      FocusManager.trapFocus(container, event)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        FocusManager.restoreFocus(previousActiveElement.current)
      }
    }
  }, [isActive])

  return containerRef
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  items: readonly string[],
  onSelect: (item: string, index: number) => void,
  isActive: boolean = true
) {
  const currentIndex = useRef<number>(-1)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || items.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        currentIndex.current = Math.min(currentIndex.current + 1, items.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        currentIndex.current = Math.max(currentIndex.current - 1, 0)
        break
      case 'Home':
        event.preventDefault()
        currentIndex.current = 0
        break
      case 'End':
        event.preventDefault()
        currentIndex.current = items.length - 1
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (currentIndex.current >= 0) {
          onSelect(items[currentIndex.current], currentIndex.current)
        }
        break
      case 'Escape':
        event.preventDefault()
        currentIndex.current = -1
        break
    }
  }, [items, onSelect, isActive])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, isActive])

  return {
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => {
      currentIndex.current = index
    }
  }
}

// Live region announcer
class LiveRegionAnnouncer {
  private static instance: LiveRegionAnnouncer
  private politeRegion: HTMLElement | null = null
  private assertiveRegion: HTMLElement | null = null

  static getInstance(): LiveRegionAnnouncer {
    if (!this.instance) {
      this.instance = new LiveRegionAnnouncer()
    }
    return this.instance
  }

  private ensureRegionsExist(): void {
    if (!this.politeRegion) {
      this.politeRegion = this.createLiveRegion('polite')
    }
    if (!this.assertiveRegion) {
      this.assertiveRegion = this.createLiveRegion('assertive')
    }
  }

  private createLiveRegion(type: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div')
    region.setAttribute('aria-live', type)
    region.setAttribute('aria-atomic', 'true')
    region.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `
    document.body.appendChild(region)
    return region
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.ensureRegionsExist()

    const region = priority === 'polite' ? this.politeRegion : this.assertiveRegion
    if (region) {
      // Clear the region first, then set the message
      region.textContent = ''
      setTimeout(() => {
        region.textContent = message
      }, 100)
    }
  }
}

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  LiveRegionAnnouncer.getInstance().announce(message, priority)
}

// Form accessibility helpers
export function getFormFieldProps(
  id: string,
  label: string,
  error?: string,
  description?: string,
  required: boolean = false
) {
  const describedBy = []

  if (description) {
    describedBy.push(`${id}-description`)
  }

  if (error) {
    describedBy.push(`${id}-error`)
  }

  return {
    field: {
      id,
      'aria-label': label,
      'aria-required': required,
      'aria-invalid': !!error,
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined
    },
    label: {
      htmlFor: id,
      id: `${id}-label`
    },
    description: description ? {
      id: `${id}-description`
    } : undefined,
    error: error ? {
      id: `${id}-error`,
      role: 'alert',
      'aria-live': 'polite'
    } : undefined
  }
}

// Modal/Dialog accessibility props
export function getDialogProps(
  id: string,
  title: string,
  description?: string
) {
  return {
    dialog: {
      id,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': `${id}-title`,
      'aria-describedby': description ? `${id}-description` : undefined
    },
    title: {
      id: `${id}-title`
    },
    description: description ? {
      id: `${id}-description`
    } : undefined
  }
}

// Button accessibility helpers
export function getButtonProps(
  label: string,
  options: {
    pressed?: boolean
    expanded?: boolean
    controls?: string
    disabled?: boolean
    loading?: boolean
  } = {}
) {
  const { pressed, expanded, controls, disabled, loading } = options

  return {
    'aria-label': label,
    'aria-pressed': pressed !== undefined ? pressed : undefined,
    'aria-expanded': expanded !== undefined ? expanded : undefined,
    'aria-controls': controls,
    'aria-disabled': disabled || loading,
    'aria-busy': loading
  }
}

// Loading state accessibility
export function getLoadingProps(isLoading: boolean, loadingText: string = 'Loading') {
  return {
    'aria-busy': isLoading,
    'aria-live': 'polite',
    'aria-label': isLoading ? loadingText : undefined
  }
}

// Skip link utilities
export function createSkipLink(targetId: string, text: string = 'Skip to main content') {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded',
    children: text
  }
}