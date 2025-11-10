'use client'

/**
 * HashtagInput Component
 *
 * Input component for adding and managing hashtags with autocomplete
 */

import { useState, KeyboardEvent, useEffect } from 'react'
import { Hash, X } from 'lucide-react'
import { useHashtags } from '@/lib/hooks/useHashtags'
import type { Hashtag } from '@/types/database'

interface HashtagInputProps {
  hashtags: string[]
  onChange: (hashtags: string[]) => void
  maxHashtags?: number
  showSuggestions?: boolean
  className?: string
}

export function HashtagInput({
  hashtags,
  onChange,
  maxHashtags = 10,
  showSuggestions = true,
  className = ''
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Hashtag[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false)

  const { searchHashtags, isLoading } = useHashtags()

  /**
   * Search for hashtag suggestions as user types
   */
  useEffect(() => {
    const searchForSuggestions = async () => {
      if (!inputValue.trim() || !showSuggestions) {
        setSuggestions([])
        setShowSuggestionDropdown(false)
        return
      }

      const results = await searchHashtags(inputValue.trim())

      // Filter out already added hashtags
      const filteredResults = results.filter(
        h => !hashtags.includes(h.tag.toLowerCase())
      )

      setSuggestions(filteredResults)
      setShowSuggestionDropdown(filteredResults.length > 0)
      setSelectedSuggestionIndex(0)
    }

    const timeoutId = setTimeout(searchForSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [inputValue, hashtags, showSuggestions, searchHashtags])

  /**
   * Handle keyboard navigation and selection
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestionDropdown && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedSuggestionIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break

        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev))
          break

        case 'Tab':
        case 'Enter':
          e.preventDefault()
          if (suggestions[selectedSuggestionIndex]) {
            addHashtag(suggestions[selectedSuggestionIndex].tag)
          } else {
            addHashtag()
          }
          break

        case 'Escape':
          e.preventDefault()
          setShowSuggestionDropdown(false)
          break

        default:
          break
      }
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    }
  }

  /**
   * Add hashtag to list
   */
  const addHashtag = (tag?: string) => {
    const tagToAdd = tag || inputValue.trim()
    if (!tagToAdd) return

    // Normalize tag (remove #, lowercase, trim)
    const normalizedTag = tagToAdd
      .replace(/^#/, '')
      .toLowerCase()
      .trim()

    // Validate tag (alphanumeric and underscore only)
    if (!/^[\w]+$/.test(normalizedTag)) {
      return
    }

    if (
      normalizedTag &&
      !hashtags.includes(normalizedTag) &&
      hashtags.length < maxHashtags
    ) {
      onChange([...hashtags, normalizedTag])
      setInputValue('')
      setSuggestions([])
      setShowSuggestionDropdown(false)
    }
  }

  /**
   * Remove hashtag from list
   */
  const removeHashtag = (tag: string) => {
    onChange(hashtags.filter(t => t !== tag))
  }

  /**
   * Select suggestion from dropdown
   */
  const selectSuggestion = (tag: string) => {
    addHashtag(tag)
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Hashtags
      </label>

      {/* Hashtag Pills */}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {hashtags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-medium border border-teal-200"
            >
              <Hash className="w-3 h-3" />
              {tag}
              <button
                onClick={() => removeHashtag(tag)}
                className="hover:text-teal-900 transition-colors"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow clicking on suggestions
            setTimeout(() => {
              setShowSuggestionDropdown(false)
            }, 200)
          }}
          placeholder={
            hashtags.length >= maxHashtags
              ? `Maximum ${maxHashtags} hashtags`
              : 'Add hashtags (press Enter or comma)'
          }
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={hashtags.length >= maxHashtags}
        />

        {/* Suggestions Dropdown */}
        {showSuggestionDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Searching hashtags...
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => selectSuggestion(suggestion.tag)}
                  className={`
                    w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors text-left
                    ${index === selectedSuggestionIndex ? 'bg-teal-50' : ''}
                  `}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {suggestion.tag}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {suggestion.usage_count.toLocaleString()} uses
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-1.5">
        {hashtags.length} / {maxHashtags} hashtags
        {hashtags.length < maxHashtags && (
          <span className="ml-2">• Press Enter or comma to add</span>
        )}
      </p>
    </div>
  )
}
