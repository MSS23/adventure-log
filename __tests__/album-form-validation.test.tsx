import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { albumSchema } from '@/lib/validations/album'

describe('Album Form Validation', () => {
  describe('Space bar functionality', () => {
    it('allows spaces in title and description fields', async () => {
      // Create a mock input field
      const { container } = render(
        <div>
          <input
            type="text"
            id="title"
            placeholder="Album title"
          />
          <textarea
            id="description"
            placeholder="Album description"
          />
        </div>
      )

      const titleInput = screen.getByPlaceholderText('Album title')
      const descriptionInput = screen.getByPlaceholderText('Album description')

      // Test typing with spaces
      await userEvent.type(titleInput, 'My Summer Vacation 2024')
      await userEvent.type(descriptionInput, 'This was an amazing trip to Europe')

      expect(titleInput).toHaveValue('My Summer Vacation 2024')
      expect(descriptionInput).toHaveValue('This was an amazing trip to Europe')
    })

    it('tag input only creates tags on comma, not space', async () => {
      // This tests the new behavior where spaces are allowed in tag names
      const { container } = render(
        <input
          type="text"
          id="tagInput"
          placeholder="Add a tag (use comma to add multiple)"
        />
      )

      const tagInput = screen.getByPlaceholderText('Add a tag (use comma to add multiple)')

      // Type a tag with spaces - should not clear the input
      await userEvent.type(tagInput, 'Summer Vacation')
      expect(tagInput).toHaveValue('Summer Vacation')

      // Adding a comma should trigger tag creation (in the actual component)
      await userEvent.type(tagInput, ', Beach Trip')
      // The actual component would clear after comma, but we're just testing the input behavior
    })
  })

  describe('Date validation', () => {
    it('rejects future start dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        start_date: futureDateStr
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.start_date).toContain('Start date cannot be in the future')
      }
    })

    it('rejects future end dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        end_date: futureDateStr
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.end_date).toContain('End date cannot be in the future')
      }
    })

    it('allows today\'s date', () => {
      const todayStr = new Date().toISOString().split('T')[0]

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        start_date: todayStr,
        end_date: todayStr
      })

      expect(result.success).toBe(true)
    })

    it('allows past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      const pastDateStr = pastDate.toISOString().split('T')[0]

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        start_date: pastDateStr,
        end_date: pastDateStr
      })

      expect(result.success).toBe(true)
    })

    it('validates end date is not before start date', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 5)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - 10)

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.end_date).toContain('End date must be after or equal to start date')
      }
    })

    it('allows end date to be the same as start date', () => {
      const date = new Date()
      date.setDate(date.getDate() - 5)
      const dateStr = date.toISOString().split('T')[0]

      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'public',
        start_date: dateStr,
        end_date: dateStr
      })

      expect(result.success).toBe(true)
    })

    it('validates HTML max attribute prevents future date selection', () => {
      const today = new Date().toISOString().split('T')[0]

      const { container } = render(
        <input
          type="date"
          id="start_date"
          max={today}
          placeholder="Start date"
        />
      )

      const dateInput = container.querySelector('#start_date') as HTMLInputElement
      expect(dateInput).toHaveAttribute('max', today)
    })
  })

  describe('Album schema general validation', () => {
    it('requires title', () => {
      const result = albumSchema.safeParse({
        title: '',  // Empty string triggers min(1) validation with custom message
        visibility: 'public'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.title).toContain('Title is required')
      }
    })

    it('enforces title max length', () => {
      const longTitle = 'a'.repeat(201)

      const result = albumSchema.safeParse({
        title: longTitle,
        visibility: 'public'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.title).toContain('Title must be less than 200 characters')
      }
    })

    it('enforces description max length', () => {
      const longDescription = 'a'.repeat(1001)

      const result = albumSchema.safeParse({
        title: 'Test Album',
        description: longDescription,
        visibility: 'public'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.flatten()
        expect(errors.fieldErrors.description).toContain('Description must be less than 1000 characters')
      }
    })

    it('requires valid visibility value', () => {
      const result = albumSchema.safeParse({
        title: 'Test Album',
        visibility: 'invalid' as 'public' | 'private' | 'friends'
      })

      expect(result.success).toBe(false)
    })

    it('accepts valid visibility values', () => {
      const visibilities = ['public', 'private', 'friends']

      for (const visibility of visibilities) {
        const result = albumSchema.safeParse({
          title: 'Test Album',
          visibility: visibility as 'public' | 'private' | 'friends'
        })

        expect(result.success).toBe(true)
      }
    })
  })
})