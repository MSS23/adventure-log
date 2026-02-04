import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  createClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ error: null })
  })
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return healthy status when all checks pass', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.version).toBeDefined()
    expect(data.platform).toBe('adventure-log')
    expect(data.checks.database).toBe(true)
    expect(data.checks.memory).toBeDefined()
    expect(data.uptime).toBeGreaterThanOrEqual(0)
  })

  it('should include response time header', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)

    expect(response.headers.get('X-Response-Time')).toBeDefined()
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
  })

  it('should return degraded status when database check fails', async () => {
    mockCreateClient.mockResolvedValueOnce({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ error: new Error('Database error') })
    })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe(false)
  })
})
