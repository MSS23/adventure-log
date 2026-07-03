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

import {
  trackGrowthEvent,
  markFirstPinStart,
  trackFirstPinIfPending,
} from '@/lib/utils/growth-events'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedLog = log as jest.Mocked<typeof log>

const TTFP_KEY = 'al_ttfp_start'

/** Let the fire-and-forget promise chain inside trackGrowthEvent settle. */
async function flushAsync() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
  }
}

/**
 * Build a mock Supabase client capturing growth_events inserts.
 * `userId` controls what auth.getSession resolves with;
 * `insertError` makes the insert resolve with { error }.
 */
function buildMockSupabase(options?: {
  userId?: string | null
  insertError?: { code: string; message: string } | null
}) {
  const insert = jest.fn().mockResolvedValue({ error: options?.insertError ?? null })
  const from = jest.fn().mockReturnValue({ insert })
  const session = options?.userId ? { user: { id: options.userId } } : null
  const client = {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session } }),
    },
    from,
  } as unknown as ReturnType<typeof createClient>
  return { client, from, insert }
}

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  jest.restoreAllMocks()
})

describe('trackGrowthEvent', () => {
  it('inserts the event with the session user id', async () => {
    const { client, from, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)

    trackGrowthEvent('album_created', { meta: { source: 'bulk-import' } })
    await flushAsync()

    expect(from).toHaveBeenCalledWith('growth_events')
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      event: 'album_created',
      value_ms: null,
      meta: { source: 'bulk-import' },
    })
  })

  it('inserts with user_id null when there is no session', async () => {
    const { client, insert } = buildMockSupabase({ userId: null })
    mockedCreateClient.mockReturnValue(client)

    trackGrowthEvent('share_link_visit')
    await flushAsync()

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null, event: 'share_link_visit' })
    )
  })

  it('rounds and clamps valueMs to a non-negative integer', async () => {
    const { client, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)

    trackGrowthEvent('first_pin', { valueMs: 1234.6 })
    await flushAsync()

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ value_ms: 1235 }))
  })

  it('does not throw and logs debug when the insert fails (e.g. table missing)', async () => {
    const { client } = buildMockSupabase({
      userId: 'user-1',
      insertError: { code: '42P01', message: 'relation "growth_events" does not exist' },
    })
    mockedCreateClient.mockReturnValue(client)

    expect(() => trackGrowthEvent('signup')).not.toThrow()
    await flushAsync()

    expect(mockedLog.debug).toHaveBeenCalledWith(
      expect.stringContaining('signup'),
      expect.objectContaining({ component: 'GrowthEvents', action: 'track' })
    )
  })

  it('does not throw when createClient throws (missing env)', () => {
    mockedCreateClient.mockImplementation(() => {
      throw new Error('Supabase is not configured')
    })

    expect(() => trackGrowthEvent('signup')).not.toThrow()
  })

  it('does not throw when getSession rejects', async () => {
    const client = {
      auth: { getSession: jest.fn().mockRejectedValue(new Error('offline')) },
      from: jest.fn(),
    } as unknown as ReturnType<typeof createClient>
    mockedCreateClient.mockReturnValue(client)

    expect(() => trackGrowthEvent('card_export')).not.toThrow()
    await flushAsync()
  })
})

describe('time-to-first-pin (markFirstPinStart / trackFirstPinIfPending)', () => {
  it('markFirstPinStart stores the current timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)

    markFirstPinStart()

    expect(localStorage.getItem(TTFP_KEY)).toBe('1000000')
  })

  it('markFirstPinStart does not overwrite an existing timestamp', () => {
    localStorage.setItem(TTFP_KEY, '500')
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)

    markFirstPinStart()

    expect(localStorage.getItem(TTFP_KEY)).toBe('500')
  })

  it('trackFirstPinIfPending is a no-op when no timestamp is stored', async () => {
    const { client, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)

    trackFirstPinIfPending()
    await flushAsync()

    expect(insert).not.toHaveBeenCalled()
  })

  it('emits first_pin with the elapsed ms and clears the key', async () => {
    const { client, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)

    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    markFirstPinStart()

    jest.spyOn(Date, 'now').mockReturnValue(1_090_000)
    trackFirstPinIfPending()
    await flushAsync()

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'first_pin', value_ms: 90_000 })
    )
    expect(localStorage.getItem(TTFP_KEY)).toBeNull()
  })

  it('only ever fires once per device', async () => {
    const { client, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)

    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    markFirstPinStart()
    jest.spyOn(Date, 'now').mockReturnValue(1_005_000)

    trackFirstPinIfPending()
    trackFirstPinIfPending()
    await flushAsync()

    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('discards a corrupted stored timestamp without inserting', async () => {
    const { client, insert } = buildMockSupabase({ userId: 'user-1' })
    mockedCreateClient.mockReturnValue(client)
    localStorage.setItem(TTFP_KEY, 'not-a-number')

    trackFirstPinIfPending()
    await flushAsync()

    expect(insert).not.toHaveBeenCalled()
    expect(localStorage.getItem(TTFP_KEY)).toBeNull()
  })
})
