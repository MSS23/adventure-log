/**
 * @jest-environment jsdom
 */
import { AppErrorHandler } from '@/lib/utils/error-handler'

describe('error-handler', () => {
  let errorHandler: AppErrorHandler

  beforeEach(() => {
    // Get fresh instance for each test
    errorHandler = AppErrorHandler.getInstance()
  })

  describe('AppErrorHandler', () => {
    describe('getInstance', () => {
      it('should return a singleton instance', () => {
        const instance1 = AppErrorHandler.getInstance()
        const instance2 = AppErrorHandler.getInstance()

        expect(instance1).toBe(instance2)
      })
    })

    describe('createError', () => {
      it('should create an error with required fields', () => {
        const error = errorHandler.createError('TEST_ERROR', 'Test message')

        expect(error.code).toBe('TEST_ERROR')
        expect(error.message).toBe('Test message')
        expect(error.timestamp).toBeDefined()
        expect(error.severity).toBe('medium') // default
        expect(error.retryable).toBe(false) // default
      })

      it('should include context information', () => {
        const context = {
          component: 'TestComponent',
          action: 'testAction',
          userId: 'user-123',
          metadata: { key: 'value' }
        }

        const error = errorHandler.createError(
          'TEST_ERROR',
          'Test message',
          context,
          'high',
          true
        )

        expect(error.component).toBe('TestComponent')
        expect(error.action).toBe('testAction')
        expect(error.userId).toBe('user-123')
        expect(error.context).toEqual({ key: 'value' })
        expect(error.severity).toBe('high')
        expect(error.retryable).toBe(true)
      })

      it('should set timestamp to ISO string format', () => {
        const error = errorHandler.createError('TEST_ERROR', 'Test message')

        // Should be valid ISO string
        expect(() => new Date(error.timestamp)).not.toThrow()
        expect(new Date(error.timestamp).toISOString()).toBe(error.timestamp)
      })
    })

    describe('handleError', () => {
      it('should handle Error instances', () => {
        const jsError = new Error('Something went wrong')
        const result = errorHandler.handleError(jsError)

        expect(result.code).toBe('UNKNOWN_ERROR')
        expect(result.message).toBe('Something went wrong')
      })

      it('should handle unknown error types with fallback message', () => {
        const unknownError = { weird: 'object' }
        const result = errorHandler.handleError(unknownError, undefined, 'Fallback message')

        expect(result.code).toBe('UNKNOWN_ERROR')
        expect(result.message).toBe('Fallback message')
      })

      it('should include context in handled error', () => {
        const error = new Error('Test error')
        const context = {
          component: 'TestComp',
          action: 'test'
        }

        const result = errorHandler.handleError(error, context)

        expect(result.component).toBe('TestComp')
        expect(result.action).toBe('test')
      })
    })

    describe('handleDatabaseError', () => {
      it('should handle PGRST116 (no rows) as NO_DATA_FOUND', () => {
        const dbError = { code: 'PGRST116', message: 'No rows found' }
        const result = errorHandler.handleDatabaseError(dbError)

        expect(result.code).toBe('NO_DATA_FOUND')
        expect(result.severity).toBe('low')
        expect(result.retryable).toBe(false)
      })

      it('should handle 23505 (unique constraint) as DUPLICATE_ENTRY', () => {
        const dbError = { code: '23505', message: 'Unique constraint violation' }
        const result = errorHandler.handleDatabaseError(dbError)

        expect(result.code).toBe('DUPLICATE_ENTRY')
        expect(result.message).toContain('already exists')
        expect(result.retryable).toBe(false)
      })

      it('should handle 23503 (foreign key) as FOREIGN_KEY_VIOLATION', () => {
        const dbError = { code: '23503', message: 'Foreign key constraint violation' }
        const result = errorHandler.handleDatabaseError(dbError)

        expect(result.code).toBe('FOREIGN_KEY_VIOLATION')
        expect(result.retryable).toBe(false)
      })

      it('should handle 42P01 (table not found) as TABLE_NOT_FOUND', () => {
        const dbError = { code: '42P01', message: 'Table does not exist' }
        const result = errorHandler.handleDatabaseError(dbError, undefined, 'fetch users')

        expect(result.code).toBe('TABLE_NOT_FOUND')
        expect(result.message).toContain('fetch users')
        expect(result.severity).toBe('high')
      })

      it('should handle unknown database errors as DATABASE_ERROR', () => {
        const dbError = { code: 'UNKNOWN_CODE', message: 'Something failed' }
        const result = errorHandler.handleDatabaseError(dbError)

        expect(result.code).toBe('DATABASE_ERROR')
        expect(result.retryable).toBe(true) // Unknown errors are retryable
      })
    })

    describe('handleNetworkError', () => {
      it('should handle timeout errors', () => {
        const timeoutError = { code: 'TIMEOUT', name: 'TimeoutError' }
        const result = errorHandler.handleNetworkError(timeoutError, undefined, '/api/test')

        expect(result.code).toBe('REQUEST_TIMEOUT')
        expect(result.message).toContain('/api/test')
        expect(result.retryable).toBe(true)
      })

      it('should handle AbortError as timeout', () => {
        const abortError = { name: 'AbortError' }
        const result = errorHandler.handleNetworkError(abortError)

        expect(result.code).toBe('REQUEST_TIMEOUT')
        expect(result.retryable).toBe(true)
      })

      it('should handle network errors (no response but has request)', () => {
        const networkError = { request: {}, message: 'Network error' }
        const result = errorHandler.handleNetworkError(networkError)

        expect(result.code).toBe('NETWORK_ERROR')
        expect(result.severity).toBe('high')
        expect(result.retryable).toBe(true)
      })

      it('should handle API errors with response', () => {
        const apiError = {
          response: { status: 400 },
          message: 'Bad request'
        }
        const result = errorHandler.handleNetworkError(apiError)

        expect(result.code).toBe('API_ERROR')
        // 4xx errors are retryable (user can fix)
        expect(result.retryable).toBe(true)
      })

      it('should handle 5xx errors as non-retryable', () => {
        const serverError = {
          response: { status: 500 },
          message: 'Internal server error'
        }
        const result = errorHandler.handleNetworkError(serverError)

        expect(result.code).toBe('API_ERROR')
        // 5xx errors are not retryable by user
        expect(result.retryable).toBe(false)
      })
    })

    describe('handleAuthError', () => {
      it('should handle 401 as UNAUTHORIZED', () => {
        const authError = { code: 401, message: 'Unauthorized' }
        const result = errorHandler.handleAuthError(authError)

        expect(result.code).toBe('UNAUTHORIZED')
        expect(result.message).toContain('not authorized')
        expect(result.retryable).toBe(false)
      })

      it('should handle 403 as FORBIDDEN', () => {
        const authError = { code: 403, message: 'Forbidden' }
        const result = errorHandler.handleAuthError(authError)

        expect(result.code).toBe('FORBIDDEN')
        expect(result.message).toContain('forbidden')
        expect(result.retryable).toBe(false)
      })

      it('should handle INVALID_TOKEN', () => {
        const authError = { code: 'INVALID_TOKEN' }
        const result = errorHandler.handleAuthError(authError)

        expect(result.code).toBe('INVALID_TOKEN')
        expect(result.message).toContain('expired')
        expect(result.retryable).toBe(false)
      })

      it('should handle unknown auth errors as AUTH_ERROR', () => {
        const authError = { code: 'UNKNOWN', message: 'Auth failed' }
        const result = errorHandler.handleAuthError(authError, undefined, 'login')

        expect(result.code).toBe('AUTH_ERROR')
        expect(result.message).toContain('login')
        expect(result.retryable).toBe(true)
      })
    })

    describe('getUserFriendlyMessage', () => {
      it('should return friendly message for NO_DATA_FOUND', () => {
        const error = errorHandler.createError('NO_DATA_FOUND', 'Technical message')
        const message = errorHandler.getUserFriendlyMessage(error)

        expect(message).toBe('No data found for your request.')
      })

      it('should return friendly message for DUPLICATE_ENTRY', () => {
        const error = errorHandler.createError('DUPLICATE_ENTRY', 'Technical message')
        const message = errorHandler.getUserFriendlyMessage(error)

        expect(message).toContain('already exists')
      })

      it('should return friendly message for auth errors', () => {
        const error = errorHandler.createError('UNAUTHORIZED', 'Technical message')
        const message = errorHandler.getUserFriendlyMessage(error)

        expect(message.toLowerCase()).toContain('log in')
      })

      it('should return friendly message for network errors', () => {
        const error = errorHandler.createError('NETWORK_ERROR', 'Technical message')
        const message = errorHandler.getUserFriendlyMessage(error)

        expect(message.toLowerCase()).toContain('connection')
      })
    })
  })

  describe('Error severity', () => {
    it('should classify database errors appropriately', () => {
      const noDataError = errorHandler.handleDatabaseError({ code: 'PGRST116' })
      expect(noDataError.severity).toBe('low')

      const tableError = errorHandler.handleDatabaseError({ code: '42P01' })
      expect(tableError.severity).toBe('high')
    })

    it('should classify network errors appropriately', () => {
      const timeoutError = errorHandler.handleNetworkError({ code: 'TIMEOUT' })
      expect(timeoutError.severity).toBe('medium')

      const networkError = errorHandler.handleNetworkError({ request: {} })
      expect(networkError.severity).toBe('high')
    })
  })
})
