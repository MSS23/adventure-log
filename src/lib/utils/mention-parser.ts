/**
 * Mention Parser Utility
 *
 * Utilities for parsing and rendering @username mentions in text content
 */

import type { User } from '@/types/database'

export interface ParsedMention {
  username: string
  displayName?: string
  userId?: string
  startIndex: number
  endIndex: number
}

/**
 * Extract all @mentions from text
 * @param text - Text content to parse
 * @returns Array of parsed mentions
 */
export function extractMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const mentionRegex = /@(\w+)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return mentions
}

/**
 * Check if cursor position is after @ character for mention trigger
 * @param text - Current text
 * @param cursorPosition - Current cursor position
 * @returns Object with isMention flag and search query
 */
export function checkMentionTrigger(
  text: string,
  cursorPosition: number
): { isMention: boolean; searchQuery: string; startIndex: number } {
  // Look backwards from cursor to find @
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex === -1) {
    return { isMention: false, searchQuery: '', startIndex: -1 }
  }

  // Check if there's whitespace between @ and cursor
  const textBetween = textBeforeCursor.slice(lastAtIndex + 1)
  if (/\s/.test(textBetween)) {
    return { isMention: false, searchQuery: '', startIndex: -1 }
  }

  return {
    isMention: true,
    searchQuery: textBetween,
    startIndex: lastAtIndex
  }
}

/**
 * Replace mention text with formatted mention
 * @param text - Original text
 * @param startIndex - Start position of @ symbol
 * @param username - Username to insert
 * @returns Updated text with mention
 */
export function insertMention(
  text: string,
  startIndex: number,
  username: string
): string {
  // Find the end of the current mention query (space or end of string)
  const afterAt = text.slice(startIndex + 1)
  const endOffset = afterAt.search(/\s/) === -1 ? afterAt.length : afterAt.search(/\s/)
  const endIndex = startIndex + 1 + endOffset

  const before = text.slice(0, startIndex)
  const after = text.slice(endIndex)

  return `${before}@${username} ${after}`
}

/**
 * Convert text with @mentions to HTML with links
 * @param text - Text containing mentions
 * @param userMap - Map of username to user data
 * @returns HTML string with linked mentions
 */
export function renderMentionsAsHTML(
  text: string,
  userMap?: Map<string, User>
): string {
  if (!text) return ''

  return text.replace(/@(\w+)/g, (match, username) => {
    const user = userMap?.get(username)
    const displayName = user?.display_name || user?.username || username
    const userId = user?.id

    if (userId) {
      return `<a href="/profile/${username}" class="mention-link text-teal-600 hover:text-teal-700 font-medium" data-user-id="${userId}">@${displayName}</a>`
    }

    return `<span class="mention-text text-gray-600">@${username}</span>`
  })
}

/**
 * Convert text with @mentions to React elements (for use in components)
 * @param text - Text containing mentions
 * @param userMap - Map of username to user data
 * @returns Array of text and mention segments
 */
export function parseMentionsForReact(
  text: string,
  userMap?: Map<string, User>
): Array<{ type: 'text' | 'mention'; content: string; user?: User }> {
  if (!text) return []

  const segments: Array<{ type: 'text' | 'mention'; content: string; user?: User }> = []
  const mentionRegex = /@(\w+)/g
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      })
    }

    // Add mention
    const username = match[1]
    const user = userMap?.get(username)
    segments.push({
      type: 'mention',
      content: username,
      user
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }

  return segments
}

/**
 * Extract user IDs from mentions in text
 * @param text - Text containing mentions
 * @param userMap - Map of username to user data
 * @returns Array of user IDs
 */
export function extractMentionedUserIds(
  text: string,
  userMap: Map<string, User>
): string[] {
  const mentions = extractMentions(text)
  const userIds: string[] = []

  for (const mention of mentions) {
    const user = userMap.get(mention.username)
    if (user?.id) {
      userIds.push(user.id)
    }
  }

  return userIds
}

/**
 * Validate mention format
 * @param mention - Mention string to validate
 * @returns True if valid mention format
 */
export function isValidMention(mention: string): boolean {
  return /^@\w+$/.test(mention)
}

/**
 * Get unique mentioned usernames from text
 * @param text - Text containing mentions
 * @returns Array of unique usernames
 */
export function getUniqueMentionedUsernames(text: string): string[] {
  const mentions = extractMentions(text)
  return [...new Set(mentions.map(m => m.username))]
}
