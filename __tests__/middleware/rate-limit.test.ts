/**
 * @jest-environment jsdom
 */

import { RateLimiter } from '@/lib/utils/input-validation'

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should allow requests within the limit', () => {
    const limiter = new RateLimiter(5, 60000)

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
  })

  it('should block requests exceeding the limit', () => {
    const limiter = new RateLimiter(3, 60000)

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    // Fourth request should be blocked
    expect(limiter.isAllowed('user-1')).toBe(false)
    expect(limiter.isAllowed('user-1')).toBe(false)
  })

  it('should reset after the time window expires', () => {
    const limiter = new RateLimiter(2, 1000) // 2 requests per 1 second

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(false)

    // Advance time past the window
    jest.advanceTimersByTime(1001)

    // Should be allowed again
    expect(limiter.isAllowed('user-1')).toBe(true)
  })

  it('should track separate keys independently', () => {
    const limiter = new RateLimiter(2, 60000)

    // Exhaust limit for user-1
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(false)

    // user-2 should still have its own allowance
    expect(limiter.isAllowed('user-2')).toBe(true)
    expect(limiter.isAllowed('user-2')).toBe(true)
    expect(limiter.isAllowed('user-2')).toBe(false)
  })

  it('should allow exactly maxRequests within the window', () => {
    const limiter = new RateLimiter(5, 60000)

    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('user-1')).toBe(true)
    }
    expect(limiter.isAllowed('user-1')).toBe(false)
  })

  it('should handle reset method', () => {
    const limiter = new RateLimiter(1, 60000)

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(false)

    limiter.reset('user-1')

    expect(limiter.isAllowed('user-1')).toBe(true)
  })

  it('should only reset the specified key', () => {
    const limiter = new RateLimiter(1, 60000)

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-2')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(false)
    expect(limiter.isAllowed('user-2')).toBe(false)

    // Reset only user-1
    limiter.reset('user-1')

    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-2')).toBe(false)
  })

  it('should gradually allow new requests as old ones expire', () => {
    const limiter = new RateLimiter(2, 1000)

    // Make 2 requests at time 0
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(true)
    expect(limiter.isAllowed('user-1')).toBe(false)

    // Advance 500ms - requests still within window
    jest.advanceTimersByTime(500)
    expect(limiter.isAllowed('user-1')).toBe(false)

    // Advance past the full window (1001ms total)
    jest.advanceTimersByTime(501)
    // Both old timestamps should have expired
    expect(limiter.isAllowed('user-1')).toBe(true)
  })
})
