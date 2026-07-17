const mockNativeClient = { auth: {} }
const mockCreateSupabaseClient = jest.fn(() => mockNativeClient)
const mockCreateBrowserClient = jest.fn()
const mockPreferencesGet = jest.fn()
const mockPreferencesSet = jest.fn()
const mockPreferencesRemove = jest.fn()

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: mockPreferencesGet,
    set: mockPreferencesSet,
    remove: mockPreferencesRemove,
  },
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateSupabaseClient,
}))

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

describe('native Supabase session storage', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  beforeEach(() => {
    mockPreferencesGet.mockReset()
    mockPreferencesSet.mockReset()
    mockPreferencesRemove.mockReset()
  })

  it('creates the APK client with Preferences storage instead of cookie storage', async () => {
    const { createClient } = await import('@/lib/supabase/client')

    expect(createClient()).toBe(mockNativeClient)
    expect(mockCreateBrowserClient).not.toHaveBeenCalled()
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    )
  })

  it('round-trips session values through Capacitor Preferences', async () => {
    const { createNativeStorageAdapter } = await import('@/lib/supabase/client')
    const storage = createNativeStorageAdapter()
    mockPreferencesGet.mockResolvedValue({ value: 'saved-session' })

    await expect(storage.getItem('session-key')).resolves.toBe('saved-session')
    await storage.setItem('session-key', 'next-session')
    await storage.removeItem('session-key')

    expect(mockPreferencesGet).toHaveBeenCalledWith({ key: 'session-key' })
    expect(mockPreferencesSet).toHaveBeenCalledWith({
      key: 'session-key',
      value: 'next-session',
    })
    expect(mockPreferencesRemove).toHaveBeenCalledWith({ key: 'session-key' })
  })
})
