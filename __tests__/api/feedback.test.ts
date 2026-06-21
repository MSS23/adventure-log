import { NextRequest } from 'next/server'

// Mock NextResponse.json to return a real Response with a working json()
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  const createMockResponse = (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
    const response = new Response(JSON.stringify(data), {
      status: init?.status || 200,
      headers: init?.headers || {},
    })
    response.json = async () => data
    return response
  }
  return {
    ...actual,
    NextResponse: { ...actual.NextResponse, json: createMockResponse },
  }
})

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

// Rate limiter — allow by default, overridable per-test
const mockRateLimit = jest.fn()
jest.mock('@/lib/utils/rate-limit', () => {
  const actual = jest.requireActual('@/lib/utils/rate-limit')
  return {
    ...actual,
    rateLimitAsync: (...args: unknown[]) => mockRateLimit(...args),
  }
})

// Auth/profile lookup
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: (...a: unknown[]) => mockFrom(...a),
  }),
}))

// Admin client — null by default (no service-role key), set per-test
let mockAdmin: unknown = null
jest.mock('@/lib/supabase/admin', () => ({
  get supabaseAdmin() {
    return mockAdmin
  },
}))

// Delivery — stubbed so tests never hit the network
const mockDiscord = jest.fn()
const mockLinear = jest.fn()
jest.mock('@/lib/services/feedback-delivery', () => ({
  deliverToDiscord: (...a: unknown[]) => mockDiscord(...a),
  deliverToLinear: (...a: unknown[]) => mockLinear(...a),
}))

import { POST } from '@/app/api/feedback/route'

function postReq(body: unknown): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'jest' },
  })
  request.json = async () => body
  return request
}

describe('/api/feedback POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAdmin = null
    mockRateLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 1000 })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockDiscord.mockResolvedValue(false)
    mockLinear.mockResolvedValue(null)
    // Default: the RLS-bound client persists the feedback row (no service-role key needed).
    mockFrom.mockImplementation((table: string) => {
      if (table === 'feedback') {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fb_1' }, error: null }) }) }) }
      }
      // users profile lookup
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
    })
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 1000 })
    const res = await POST(postReq({ category: 'bug', message: 'something broke' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for a too-short message', async () => {
    const res = await POST(postReq({ category: 'idea', message: 'hi' }))
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/detail/i)
  })

  it('returns 400 for an invalid category', async () => {
    const res = await POST(postReq({ category: 'spam', message: 'a valid length message' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the body is not JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', { method: 'POST' })
    request.json = async () => {
      throw new Error('bad json')
    }
    const res = await POST(request)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid request body')
  })

  it('accepts anonymous feedback and fans out to Discord + Linear (201)', async () => {
    mockDiscord.mockResolvedValueOnce(true)
    mockLinear.mockResolvedValueOnce({ id: 'iss_1', url: 'https://linear.app/x/iss_1' })

    const res = await POST(postReq({ category: 'bug', message: 'the globe will not load' }))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.ok).toBe(true)
    expect(mockDiscord).toHaveBeenCalledTimes(1)
    expect(mockLinear).toHaveBeenCalledTimes(1)
    // Persisted via the RLS-bound client even without a service-role key.
    expect(data.id).toBe('fb_1')
  })

  it('persists via the service-role client when the RLS write is rejected', async () => {
    // RLS-bound insert fails, admin client available -> falls back to admin.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'feedback') {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'row-level security' } }) }) }) }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
    })
    mockAdmin = {
      from: () => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fb_admin' }, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
    }

    const res = await POST(postReq({ category: 'bug', message: 'fallback path works' }))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.id).toBe('fb_admin')
  })

  it('attaches the username for a signed-in user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'feedback') {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fb_1' }, error: null }) }) }) }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { username: 'jane' }, error: null }) }) }) }
    })

    const res = await POST(postReq({ category: 'praise', message: 'love this app so much' }))
    expect(res.status).toBe(201)
    const passed = mockDiscord.mock.calls[0][0]
    expect(passed.username).toBe('jane')
    expect(passed.userId).toBe('user-1')
  })
})
