import { GET } from '@/app/api/geocode/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitAsync, rateLimitResponse } from '@/lib/utils/rate-limit'

// Mock NextResponse.json to return a proper Response with json() method
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')

  // Create a Response-like object with json() method
  const createMockResponse = (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
    const body = JSON.stringify(data)
    const response = new Response(body, {
      status: init?.status || 200,
      headers: init?.headers || {}
    })
    // Override json() to return the original data
    response.json = async () => data
    return response
  }

  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: createMockResponse
    }
  }
})

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

// Mock rate limiting (the route uses the async Redis-backed limiter; the sync
// rateLimit is kept in the mock for the shared config import surface)
jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true }),
  rateLimitAsync: jest.fn().mockResolvedValue({ success: true, remaining: 59, reset: Date.now() + 60000 }),
  rateLimitResponse: jest.fn(),
  rateLimitConfigs: {
    geocode: { limit: 60, windowMs: 60000 }
  }
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRateLimit = rateLimitAsync as jest.MockedFunction<typeof rateLimitAsync>
const mockRateLimitResponse = rateLimitResponse as jest.MockedFunction<typeof rateLimitResponse>

describe('/api/geocode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should require authentication', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        })
      }
    })

    const request = new NextRequest('http://localhost:3000/api/geocode?lat=40.7128&lng=-74.0060')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should enforce rate limiting', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000 })

    mockRateLimitResponse.mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    )

    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      }
    })

    const request = new NextRequest('http://localhost:3000/api/geocode?lat=40.7128&lng=-74.0060')
    await GET(request)

    expect(mockRateLimit).toHaveBeenCalled()
  })

  it('should return 400 for missing parameters', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      }
    })

    const request = new NextRequest('http://localhost:3000/api/geocode')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing required parameters')
  })
})
