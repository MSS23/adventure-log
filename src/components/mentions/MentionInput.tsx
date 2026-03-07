'use client'

/**
 * MentionInput Component
 *
 * Rich text input with @mention support
 */

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { User } from '@/types/database'
import { useMentions } from '@/lib/hooks/useMentions'
import { checkMentionTrigger, insertMention } from '@/lib/utils/mention-parser'
import { UserSuggestionDropdown } from './UserSuggestionDropdown'

interface MentionInputProps {
  value: string
  onChange: (value: string, mentionedUsers?: User[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
  rows?: number
}

export function MentionInput({
  value,
  onChange,
  placeholder = 'Write a comment...',
  className = '',
  disabled = false,
  maxLength,
  rows = 3
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { suggestions, isLoading, searchUsers, clearSuggestions } = useMentions()

  /**
   * Handle text change
   */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0

    onChange(newValue, mentionedUsers)

    // Check if we should show mention suggestions
    const mentionCheck = checkMentionTrigger(newValue, cursorPosition)

    if (mentionCheck.isMention && mentionCheck.searchQuery) {
      searchUsers(mentionCheck.searchQuery)
      setShowSuggestions(true)
      setSelectedSuggestionIndex(0)
    } else {
      setShowSuggestions(false)
      clearSuggestions()
    }
  }

  /**
   * Handle key down for navigation and selection
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : prev
        )
        break

      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedSuggestionIndex]) {
          handleSelectUser(suggestions[selectedSuggestionIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        clearSuggestions()
        break
    }
  }

  /**
   * Handle user selection from dropdown
   */
  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return

    const cursorPosition = textareaRef.current.selectionStart
    const mentionCheck = checkMentionTrigger(value, cursorPosition)

    if (mentionCheck.isMention) {
      const newValue = insertMention(
        value,
        mentionCheck.startIndex,
        user.username || ''
      )

      // Add user to mentioned users if not already there
      const updatedMentionedUsers = mentionedUsers.find(u => u.id === user.id)
        ? mentionedUsers
        : [...mentionedUsers, user]

      setMentionedUsers(updatedMentionedUsers)
      onChange(newValue, updatedMentionedUsers)

      // Move cursor after mention
      const newCursorPos = mentionCheck.startIndex + user.username!.length + 2 // @ + username + space
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    }

    setShowSuggestions(false)
    clearSuggestions()
    setSelectedSuggestionIndex(0)
  }

  /**
   * Close suggestions when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false)
      clearSuggestions()
    }

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSuggestions, clearSuggestions])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
          resize-none transition-all
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          ${className}
        `}
      />

      {showSuggestions && (
        <div className="relative">
          <UserSuggestionDropdown
            users={suggestions}
            onSelectUser={handleSelectUser}
            selectedIndex={selectedSuggestionIndex}
            isLoading={isLoading}
          />
        </div>
      )}

      {maxLength && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  )
}
