import { NextRequest } from 'next/server'

// Mock NextResponse.json to return a proper Response with json() method
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')

  const createMockResponse = (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
    const body = JSON.stringify(data)
    const response = new Response(body, {
      status: init?.status || 200,
      headers: init?.headers || {}
    })
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

jest.mock('@/lib/utils/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  })
}))

import { GET, POST } from '@/app/api/wishlist/route'

// Helper to create a chainable query builder mock
function createQueryChain() {
  const chain: Record<string, jest.Mock> = {}
  const defaultMethods = ['select', 'insert', 'update', 'delete', 'eq', 'is', 'in', 'order', 'maybeSingle', 'single']
  for (const method of defaultMethods) {
    chain[method] = jest.fn().mockReturnValue(chain)
  }
  return chain
}

// Helper to create a POST NextRequest with a properly mockable json body
function createPostRequest(url: string, body: Record<string, unknown>): NextRequest {
  const request = new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // Override json() to ensure body is parseable in jsdom test environment
  request.json = async () => body
  return request
}

describe('/api/wishlist', () => {
  const mockUser = { id: 'user-123', email: 'test@test.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') })

      const request = new NextRequest('http://localhost:3000/api/wishlist')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return wishlist items for authenticated user', async () => {
      const mockItems = [
        { id: '1', location_name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
        { id: '2', location_name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 }
      ]

      const chain = createQueryChain()
      chain['is'] = jest.fn().mockResolvedValue({ data: mockItems, error: null })
      mockFrom.mockReturnValue(chain)

      const request = new NextRequest('http://localhost:3000/api/wishlist')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toBeDefined()
      expect(data.items).toHaveLength(2)
    })

    it('should return 403 when viewing non-mutual-follow wishlist', async () => {
      const chain = createQueryChain()
      chain['maybeSingle'] = jest.fn().mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const request = new NextRequest('http://localhost:3000/api/wishlist?userId=other-user-456')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('mutual follows')
    })
  })

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') })

      const request = createPostRequest('http://localhost:3000/api/wishlist', { location_name: 'Paris' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing location_name', async () => {
      const request = createPostRequest('http://localhost:3000/api/wishlist', {
        latitude: 48.8566,
        longitude: 2.3522
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Location name')
    })

    it('should return 400 for missing coordinates', async () => {
      const request = createPostRequest('http://localhost:3000/api/wishlist', {
        location_name: 'Paris'
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Latitude and longitude')
    })

    it('should return 400 for invalid priority', async () => {
      const request = createPostRequest('http://localhost:3000/api/wishlist', {
        location_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        priority: 'urgent'
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Priority')
    })

    it('should create wishlist item successfully with 201', async () => {
      const createdItem = {
        id: 'new-item-1',
        location_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        priority: 'medium',
        source: 'manual'
      }

      const chain = createQueryChain()
      chain['single'] = jest.fn().mockResolvedValue({ data: createdItem, error: null })
      mockFrom.mockReturnValue(chain)

      const request = createPostRequest('http://localhost:3000/api/wishlist', {
        location_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.item).toBeDefined()
    })

    it('should return 409 for duplicate item', async () => {
      const chain = createQueryChain()
      chain['single'] = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      })
      mockFrom.mockReturnValue(chain)

      const request = createPostRequest('http://localhost:3000/api/wishlist', {
        location_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already on your wishlist')
    })

    it('should return 400 for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/wishlist', {
        method: 'POST',
      })
      // Force json() to throw to simulate invalid body
      request.json = async () => { throw new Error('Invalid JSON') }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })
  })
})
