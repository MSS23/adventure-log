/**
 * @jest-environment jsdom
 */

// Mock the Supabase client module before importing the SUT
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock the logger to avoid noisy console output and to assert calls
jest.mock('@/lib/utils/logger', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    userAction: jest.fn(),
    apiCall: jest.fn(),
    performance: jest.fn(),
  },
}))

import { getPhotoUrl, getPhotoUrls } from '@/lib/utils/photo-url'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedLog = log as jest.Mocked<typeof log>

/**
 * Helper to construct a mock Supabase client whose
 * storage.from().getPublicUrl() returns the requested URL.
 */
function buildMockSupabase(publicUrl: string | null | undefined) {
  return {
    storage: {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: publicUrl === undefined ? undefined : { publicUrl },
        }),
      }),
    },
  } as unknown as ReturnType<typeof createClient>
}

describe('getPhotoUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('invalid input handling', () => {
    it('returns undefined for null', () => {
      expect(getPhotoUrl(null)).toBeUndefined()
    })

    it('returns undefined for undefined', () => {
      expect(getPhotoUrl(undefined)).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
      expect(getPhotoUrl('')).toBeUndefined()
    })

    it('returns undefined for a whitespace-only string', () => {
      expect(getPhotoUrl('   ')).toBeUndefined()
    })

    it('returns undefined when filePath is not a string', () => {
      // Force-cast to bypass the TS type and exercise the runtime guard
      expect(getPhotoUrl(123 as unknown as string)).toBeUndefined()
      expect(getPhotoUrl({} as unknown as string)).toBeUndefined()
      expect(getPhotoUrl([] as unknown as string)).toBeUndefined()
    })
  })

  describe('full URL passthrough', () => {
    it('returns a valid http URL unchanged', () => {
      const url = 'http://example.com/photo.jpg'
      expect(getPhotoUrl(url)).toBe(url)
    })

    it('returns a valid https URL unchanged', () => {
      const url = 'https://cdn.example.com/path/photo.jpg'
      expect(getPhotoUrl(url)).toBe(url)
    })

    it('returns undefined and logs a warning for an invalid http(s) URL', () => {
      // The string starts with "http://" (so it enters the URL-validation branch)
      // but is otherwise malformed.
      const malformed = 'http://'
      const result = getPhotoUrl(malformed)
      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid full URL'),
        expect.objectContaining({ component: 'PhotoUrl' })
      )
    })

    it('does not call Supabase for a full URL', () => {
      getPhotoUrl('https://example.com/photo.jpg')
      expect(mockedCreateClient).not.toHaveBeenCalled()
    })
  })

  describe('Supabase storage URL generation', () => {
    it('returns the public URL for a relative file path', () => {
      const publicUrl = 'https://test.supabase.co/storage/v1/object/public/photos/user-1/album-1/photo.jpg'
      mockedCreateClient.mockReturnValue(buildMockSupabase(publicUrl))

      const result = getPhotoUrl('user-1/album-1/photo.jpg')

      expect(result).toBe(publicUrl)
      expect(mockedCreateClient).toHaveBeenCalled()
    })

    it('uses the default "photos" bucket when none is provided', () => {
      const publicUrl = 'https://test.supabase.co/storage/v1/object/public/photos/p.jpg'
      const mockClient = buildMockSupabase(publicUrl)
      mockedCreateClient.mockReturnValue(mockClient)

      getPhotoUrl('p.jpg')

      expect(mockClient.storage.from).toHaveBeenCalledWith('photos')
    })

    it('respects a custom bucket name', () => {
      const publicUrl = 'https://test.supabase.co/storage/v1/object/public/avatars/u.jpg'
      const mockClient = buildMockSupabase(publicUrl)
      mockedCreateClient.mockReturnValue(mockClient)

      getPhotoUrl('u.jpg', 'avatars')

      expect(mockClient.storage.from).toHaveBeenCalledWith('avatars')
    })

    it('returns undefined and warns when Supabase client is null', () => {
      mockedCreateClient.mockReturnValue(null as unknown as ReturnType<typeof createClient>)

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalledWith(
        'Supabase client not initialized',
        expect.objectContaining({ component: 'PhotoUrl', action: 'get-photo-url' })
      )
    })

    it('returns undefined and warns when getPublicUrl returns no URL', () => {
      mockedCreateClient.mockReturnValue(buildMockSupabase(''))

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('No public URL'),
        expect.objectContaining({ component: 'PhotoUrl' })
      )
    })

    it('returns undefined and warns when getPublicUrl response data is missing', () => {
      // Force the Supabase client to return undefined for `data`
      mockedCreateClient.mockReturnValue(buildMockSupabase(undefined))

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalled()
    })

    it('returns undefined when public URL does not start with http(s)', () => {
      // A URL constructor would accept "ftp://..." but we explicitly reject
      // anything that's not http(s).
      mockedCreateClient.mockReturnValue(buildMockSupabase('ftp://example.com/file.jpg'))

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not start with http'),
        expect.objectContaining({ component: 'PhotoUrl' })
      )
    })

    it('returns undefined when Supabase returns the same input path back (relative-path guard)', () => {
      // Defensive: storage.getPublicUrl returns the input path verbatim.
      // Because it does not start with http(s), the earlier check fires.
      const filePath = 'user-1/album-1/photo.jpg'
      mockedCreateClient.mockReturnValue(buildMockSupabase(filePath))

      const result = getPhotoUrl(filePath)

      expect(result).toBeUndefined()
    })


    it('returns undefined when the generated public URL is malformed', () => {
      // "https:not-a-real-url" passes the startsWith('https://') check
      // would fail — instead use one that fails the URL constructor.
      // We craft a getPublicUrl response whose URL constructor throws.
      const mockClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            getPublicUrl: jest
              .fn()
              .mockReturnValue({ data: { publicUrl: 'https://[invalid' } }),
          }),
        },
      } as unknown as ReturnType<typeof createClient>
      mockedCreateClient.mockReturnValue(mockClient)

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid URL generated'),
        expect.objectContaining({ component: 'PhotoUrl' })
      )
    })

    it('returns undefined and logs error when createClient throws', () => {
      mockedCreateClient.mockImplementation(() => {
        throw new Error('Boom')
      })

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting photo URL'),
        expect.objectContaining({ component: 'PhotoUrl' }),
        expect.any(Error)
      )
    })

    it('returns undefined and logs error when getPublicUrl throws', () => {
      const mockClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            getPublicUrl: jest.fn().mockImplementation(() => {
              throw new Error('Storage failure')
            }),
          }),
        },
      } as unknown as ReturnType<typeof createClient>
      mockedCreateClient.mockReturnValue(mockClient)

      const result = getPhotoUrl('user/photo.jpg')

      expect(result).toBeUndefined()
      expect(mockedLog.error).toHaveBeenCalled()
    })
  })
})

describe('getPhotoUrls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns an empty array for an empty input array', () => {
    expect(getPhotoUrls([])).toEqual([])
  })

  it('returns an empty array when all entries are invalid', () => {
    const result = getPhotoUrls([null, undefined, ''])
    expect(result).toEqual([])
  })

  it('keeps full http(s) URLs and filters out invalid entries', () => {
    const result = getPhotoUrls([
      'https://example.com/a.jpg',
      null,
      'https://example.com/b.jpg',
      undefined,
      '',
    ])

    expect(result).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
    ])
  })

  it('combines full URLs with Supabase-generated URLs', () => {
    mockedCreateClient.mockReturnValue(
      buildMockSupabase('https://test.supabase.co/storage/v1/object/public/photos/file.jpg')
    )

    const result = getPhotoUrls([
      'https://cdn.example.com/full.jpg',
      'user/file.jpg',
    ])

    expect(result).toEqual([
      'https://cdn.example.com/full.jpg',
      'https://test.supabase.co/storage/v1/object/public/photos/file.jpg',
    ])
  })

  it('forwards the bucket parameter to getPhotoUrl', () => {
    const mockClient = buildMockSupabase('https://test.supabase.co/storage/v1/object/public/avatars/file.jpg')
    mockedCreateClient.mockReturnValue(mockClient)

    getPhotoUrls(['file.jpg'], 'avatars')

    expect(mockClient.storage.from).toHaveBeenCalledWith('avatars')
  })
})
