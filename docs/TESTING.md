# Testing Guide

Complete testing strategy, setup, and best practices for Adventure Log.

**Current Test Coverage:** 0% ❌
**Target Test Coverage:** 60%+ ✅

---

## Quick Start

```bash
# Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

## Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| Jest | Test runner | Latest |
| React Testing Library | Component testing | Latest |
| Playwright | E2E testing | Latest |
| MSW (Mock Service Worker) | API mocking | Latest |

---

## Setup Instructions

### 1. Jest Configuration

**Create `jest.config.ts`:**
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
}

export default createJestConfig(config)
```

**Create `jest.setup.ts`:**
```typescript
import '@testing-library/jest-dom'
import { server } from './__mocks__/server'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Start MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 2. Mock Service Worker Setup

**Create `__mocks__/handlers.ts`:**
```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Supabase endpoints
  http.get('https://*.supabase.co/rest/v1/albums', () => {
    return HttpResponse.json([
      {
        id: 'test-album-1',
        title: 'Test Album',
        user_id: 'test-user',
        visibility: 'public',
      },
    ])
  }),

  // Mock geocoding
  http.get('/api/geocode', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    return HttpResponse.json([
      {
        place_id: 1,
        lat: '48.8566',
        lon: '2.3522',
        display_name: `Results for ${query}`,
      },
    ])
  }),
]
```

**Create `__mocks__/server.ts`:**
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### 3. Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Testing Patterns

### Unit Tests - Components

**Example: AuthProvider.test.tsx**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('AuthProvider', () => {
  it('provides user and profile to children', async () => {
    const TestComponent = () => {
      const { user, profile } = useAuth()
      return <div>{profile?.username || 'No user'}</div>
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-id' } } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'test-id', username: 'testuser' },
      }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })
  })
})
```

### Integration Tests - Hooks

**Example: useFeedData.test.ts**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useFeedData } from '@/lib/hooks/useFeedData'

describe('useFeedData', () => {
  it('fetches and returns feed albums', async () => {
    const { result } = renderHook(() => useFeedData())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.albums).toHaveLength(1)
      expect(result.current.albums[0].title).toBe('Test Album')
    })
  })

  it('handles errors gracefully', async () => {
    // Mock error response
    server.use(
      http.get('*/rest/v1/albums', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useFeedData())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
```

### E2E Tests - Playwright

**Install Playwright:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Create `playwright.config.ts`:**
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
})
```

**Example: e2e/auth.spec.ts**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('user can sign up and log in', async ({ page }) => {
    // Go to signup page
    await page.goto('/signup')

    // Fill signup form
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // Should see welcome message
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('requires authentication for protected routes', async ({ page }) => {
    await page.goto('/albums')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
```

---

## Critical Test Scenarios

### 1. Authentication Flow
```typescript
// tests/auth/auth-flow.test.tsx
describe('Authentication Flow', () => {
  it('creates profile on first login')
  it('handles username conflicts')
  it('caches profile data')
  it('refreshes profile on update')
  it('clears cache on signout')
})
```

### 2. Photo Upload
```typescript
// tests/photos/upload.test.tsx
describe('Photo Upload', () => {
  it('extracts EXIF data from photo')
  it('generates thumbnails')
  it('detects duplicate photos by hash')
  it('validates file size and type')
  it('handles upload errors gracefully')
})
```

### 3. Privacy Controls
```typescript
// tests/privacy/access-control.test.ts
describe('Privacy Controls', () => {
  it('shows only public albums to anonymous users')
  it('shows friends-only albums to friends')
  it('hides private albums from non-owners')
  it('respects RLS policies')
})
```

### 4. Globe Visualization
```typescript
// tests/globe/globe.test.tsx
describe('Globe Visualization', () => {
  it('renders pins for all locations')
  it('animates flight paths between locations')
  it('filters by year')
  it('handles missing location data')
  it('lazy loads for performance')
})
```

### 5. Album Sharing
```typescript
// tests/sharing/album-sharing.test.ts
describe('Album Sharing', () => {
  it('generates unique share token')
  it('respects permission levels (view/contribute/edit)')
  it('expires shares after expiration date')
  it('prevents unauthorized access')
})
```

---

## Test Data Factories

**Create `tests/factories/index.ts`:**
```typescript
import { faker } from '@faker-js/faker'

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  privacy_level: 'public',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockAlbum = (overrides?: Partial<Album>): Album => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  location_name: faker.location.city(),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  date_start: faker.date.past().toISOString(),
  visibility: 'public',
  status: 'published',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})
```

---

## Coverage Goals

### Target Coverage by Component Type

| Component Type | Target | Priority |
|----------------|--------|----------|
| Auth Components | 90% | Critical |
| Data Hooks | 80% | Critical |
| UI Components | 60% | Medium |
| Utils | 90% | High |
| API Routes | 75% | High |

### Must-Test Files

1. **`src/components/auth/AuthProvider.tsx`** ✅ Critical
2. **`src/lib/hooks/useFeedData.ts`** ✅ Critical
3. **`src/lib/hooks/useTravelTimeline.ts`** ✅ Critical
4. **`src/lib/utils/privacy.ts`** ✅ Critical
5. **`src/lib/utils/photo-url.ts`** ✅ High
6. **`src/app/actions/album-sharing.ts`** ✅ High
7. **`src/app/actions/photo-metadata.ts`** ✅ High

---

## Best Practices

### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - tests implementation details
expect(component.state.isLoading).toBe(true)

// ✅ Good - tests user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument()
```

### 2. Use Semantic Queries
```typescript
// ❌ Bad - fragile
screen.getByTestId('submit-button')

// ✅ Good - accessible
screen.getByRole('button', { name: /submit/i })
```

### 3. Avoid Testing Library Details
```typescript
// ❌ Bad
expect(mockFunction).toHaveBeenCalledWith(/* exact params */)

// ✅ Good
expect(screen.getByText('Success')).toBeInTheDocument()
```

### 4. Test Error States
```typescript
it('shows error message on failed upload', async () => {
  server.use(
    http.post('*/storage/v1/object/*', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  const { result } = renderHook(() => usePhotoUpload())

  await act(async () => {
    await result.current.uploadPhoto(mockFile)
  })

  expect(result.current.error).toBe('Upload failed')
})
```

---

## Continuous Integration

### GitHub Actions Workflow

**Create `.github/workflows/test.yml`:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Testing Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Jest + RTL
- [ ] Configure MSW
- [ ] Write AuthProvider tests
- [ ] Test critical hooks (useFeedData, useAuth)
- [ ] Achieve 30% coverage

### Phase 2: Core Features (Week 2-3)
- [ ] Photo upload tests
- [ ] Privacy control tests
- [ ] Album sharing tests
- [ ] Social features tests (likes, comments)
- [ ] Achieve 50% coverage

### Phase 3: E2E Tests (Week 4)
- [ ] Set up Playwright
- [ ] Authentication flow E2E
- [ ] Photo upload E2E
- [ ] Globe interaction E2E
- [ ] Achieve 60% coverage

### Phase 4: Advanced (Month 2)
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Load testing
- [ ] Achieve 70%+ coverage

---

## Debugging Tests

### Run Specific Test
```bash
npm test -- AuthProvider.test.tsx
```

### Debug in VS Code
**Create `.vscode/launch.json`:**
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasename}", "--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/docs/)
