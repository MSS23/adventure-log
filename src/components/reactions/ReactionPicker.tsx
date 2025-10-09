'use client'

import React, { useState } from 'react'
import type { GlobeReactionType } from '@/types/database'
import { instagramStyles } from '@/lib/design-tokens'

interface ReactionPickerProps {
  reactionTypes: GlobeReactionType[]
  onSelect: (reactionType: GlobeReactionType, message?: string) => void
  onClose: () => void
  showMessageInput?: boolean
}

export function ReactionPicker({
  reactionTypes,
  onSelect,
  onClose,
  showMessageInput = true
}: ReactionPickerProps) {
  const [selectedType, setSelectedType] = useState<GlobeReactionType | null>(null)
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)

  const handleReactionClick = (type: GlobeReactionType) => {
    setSelectedType(type)
    if (showMessageInput) {
      setShowMessage(true)
    } else {
      onSelect(type)
      onClose()
    }
  }

  const handleSubmit = () => {
    if (selectedType) {
      onSelect(selectedType, message || undefined)
      onClose()
    }
  }

  // Group reactions by category
  const groupedReactions = reactionTypes.reduce((acc, type) => {
    const category = type.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(type)
    return acc
  }, {} as Record<string, GlobeReactionType[]>)

  const categoryLabels: Record<string, string> = {
    memory: 'Memories',
    suggestion: 'Suggestions',
    emotion: 'Emotions',
    action: 'Actions',
    other: 'Other'
  }

  if (showMessage && selectedType) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className={instagramStyles.text.heading}>
            Add a message (optional)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selected reaction preview */}
        <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center gap-3">
          <span className="text-4xl">{selectedType.emoji}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {selectedType.label}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedType.description}
            </p>
          </div>
        </div>

        {/* Message input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note or suggestion..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={3}
          maxLength={500}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowMessage(false)}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors ${instagramStyles.button.primary}`}
          >
            Send Reaction
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className={instagramStyles.text.heading}>
          Choose a reaction
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Reaction grid by category */}
      <div className="space-y-6">
        {Object.entries(groupedReactions).map(([category, types]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {categoryLabels[category] || category}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {types.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleReactionClick(type)}
                  className="group relative p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: selectedType?.id === type.id ? type.color : undefined
                  }}
                  title={type.description}
                >
                  <div className="text-4xl mb-2">{type.emoji}</div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                    {type.label}
                  </p>

                  {/* Tooltip on hover */}
                  {type.description && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {type.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
