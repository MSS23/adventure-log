/**
 * @jest-environment jsdom
 */

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn((filePath: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/photos/${filePath}` }
        }))
      }))
    }
  }))
}))

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { getPhotoUrl, getPhotoUrls } from '@/lib/utils/photo-url'
import { createClient } from '@/lib/supabase/client'

describe('photo-url', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPhotoUrl', () => {
    it('should return undefined for null input', () => {
      expect(getPhotoUrl(null)).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(getPhotoUrl(undefined)).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      expect(getPhotoUrl('')).toBeUndefined()
    })

    it('should return undefined for whitespace-only string', () => {
      expect(getPhotoUrl('   ')).toBeUndefined()
    })

    it('should return undefined for non-string inputs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getPhotoUrl(123 as any)).toBeUndefined()
    })

    it('should return the same URL if already a full HTTP URL', () => {
      const url = 'http://example.com/photo.jpg'
      expect(getPhotoUrl(url)).toBe(url)
    })

    it('should return the same URL if already a full HTTPS URL', () => {
      const url = 'https://example.com/photo.jpg'
      expect(getPhotoUrl(url)).toBe(url)
    })

    it('should return undefined for invalid full URLs', () => {
      // A string starting with http:// but not a valid URL
      expect(getPhotoUrl('http://')).toBeUndefined()
    })

    it('should convert relative path to full Supabase URL', () => {
      const result = getPhotoUrl('user-123/album-456/photo.jpg')
      expect(result).toBe('https://test.supabase.co/storage/v1/object/public/photos/user-123/album-456/photo.jpg')
    })

    it('should use photos as default bucket', () => {
      const mockFrom = jest.fn(() => ({
        getPublicUrl: jest.fn((filePath: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/photos/${filePath}` }
        }))
      }));
      (createClient as jest.Mock).mockReturnValueOnce({
        storage: { from: mockFrom }
      })

      getPhotoUrl('test/photo.jpg')
      expect(mockFrom).toHaveBeenCalledWith('photos')
    })

    it('should accept custom bucket parameter', () => {
      // Reset and create a new mock that tracks the bucket
      const mockFrom = jest.fn(() => ({
        getPublicUrl: jest.fn((filePath: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/avatars/${filePath}` }
        }))
      }));
      (createClient as jest.Mock).mockReturnValueOnce({
        storage: { from: mockFrom }
      })

      const result = getPhotoUrl('user-123/avatar.jpg', 'avatars')
      expect(mockFrom).toHaveBeenCalledWith('avatars')
      expect(result).toBe('https://test.supabase.co/storage/v1/object/public/avatars/user-123/avatar.jpg')
    })

    it('should return undefined if supabase client returns no publicUrl', () => {
      (createClient as jest.Mock).mockReturnValueOnce({
        storage: {
          from: jest.fn(() => ({
            getPublicUrl: jest.fn(() => ({
              data: { publicUrl: null }
            }))
          }))
        }
      })

      expect(getPhotoUrl('test/photo.jpg')).toBeUndefined()
    })

    it('should return undefined if createClient returns null', () => {
      (createClient as jest.Mock).mockReturnValueOnce(null)

      expect(getPhotoUrl('test/photo.jpg')).toBeUndefined()
    })
  })

  describe('getPhotoUrls', () => {
    it('should filter out null and undefined paths', () => {
      const result = getPhotoUrls([null, undefined, 'user/photo.jpg'])
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('user/photo.jpg')
    })

    it('should return array of valid URLs', () => {
      const result = getPhotoUrls(['path1/photo.jpg', 'path2/photo.jpg'])
      expect(result).toHaveLength(2)
      expect(result[0]).toContain('path1/photo.jpg')
      expect(result[1]).toContain('path2/photo.jpg')
    })

    it('should return empty array for all invalid inputs', () => {
      const result = getPhotoUrls([null, undefined, ''])
      expect(result).toEqual([])
    })
  })
})
