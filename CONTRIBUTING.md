# Contributing to Adventure Log

Thank you for your interest in contributing to Adventure Log! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Code of Conduct

This project follows a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

**Expected Behavior:**
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **Git** for version control
- **Docker** (optional, for containerized development)
- **Supabase Account** (for backend services)
- **Code Editor** with TypeScript support (VS Code recommended)

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Click "Fork" button on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/adventure-log.git
   cd adventure-log
   ```

3. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/MSS23/adventure-log.git
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

6. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Before Starting Work

1. **Sync with Upstream**
   ```bash
   git fetch upstream
   git checkout master
   git merge upstream/master
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-name
   ```

### During Development

1. **Make Small, Focused Commits**
   - Each commit should represent a single logical change
   - Follow conventional commit format (see below)

2. **Test Locally**
   ```bash
   npm run type-check  # TypeScript compilation
   npm run lint        # ESLint
   npm test            # Run tests
   ```

3. **Keep Branch Updated**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

---

## Coding Standards

### TypeScript

**File Structure:**
```typescript
// 1. Imports (grouped)
import { useState } from 'react'          // External
import { createClient } from '@/lib/supabase/client'  // Internal

// 2. Types and Interfaces
interface Props {
  userId: string
  onComplete: () => void
}

// 3. Component/Function
export function MyComponent({ userId, onComplete }: Props) {
  // Implementation
}
```

**Naming Conventions:**
- **Components**: PascalCase (`UserProfile.tsx`)
- **Functions/Variables**: camelCase (`fetchUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`Album`, `CreateAlbumRequest`)
- **Files**: kebab-case for utilities (`photo-url.ts`)

**Type Safety:**
```typescript
// ✅ Good - Explicit types
function getUser(id: string): Promise<User> {
  return fetchUser(id)
}

// ❌ Bad - Implicit any
function getUser(id) {
  return fetchUser(id)
}
```

### React Components

**Use Functional Components:**
```typescript
// ✅ Good
export function UserCard({ user }: Props) {
  return <div>{user.name}</div>
}

// ❌ Bad - Class components
export class UserCard extends React.Component {
  render() {
    return <div>{this.props.user.name}</div>
  }
}
```

**Hook Rules:**
```typescript
// ✅ Good - Hooks at top level
export function MyComponent() {
  const [data, setData] = useState(null)
  const { user } = useAuth()

  if (!user) return null

  return <div>...</div>
}

// ❌ Bad - Conditional hooks
export function MyComponent() {
  if (condition) {
    const [data, setData] = useState(null)  // ERROR!
  }
}
```

### Styling

**Use Tailwind CSS:**
```typescript
// ✅ Good - Tailwind utility classes
<div className="flex items-center space-x-4 p-4 rounded-lg bg-white shadow-sm">

// ❌ Bad - Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

**Use Design Tokens:**
```typescript
import { appStyles } from '@/lib/design-tokens'

<div className={appStyles.card}>
<button className={appStyles.button.primary}>
```

### File Organization

```
src/
├── components/
│   └── feature-name/         # Group by feature
│       ├── FeatureComponent.tsx
│       ├── FeatureList.tsx
│       └── index.ts          # Export barrel
├── lib/
│   ├── hooks/
│   │   └── useFeature.ts
│   └── utils/
│       └── feature-utils.ts
└── types/
    └── feature.ts
```

---

## Commit Guidelines

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes

**Examples:**
```bash
feat(auth): add social login with Google

- Integrate Google OAuth with Supabase
- Add redirect handling after login
- Update login UI with Google button

Closes #123
```

```bash
fix(photos): correct EXIF extraction for rotated images

Images taken in portrait mode were not being rotated correctly
due to missing EXIF orientation handling.

Fixes #456
```

```bash
docs: update API documentation for album sharing

- Add examples for share token generation
- Document permission levels
- Include error responses
```

**Commit Message Rules:**
1. Use imperative mood ("add feature" not "added feature")
2. First line max 72 characters
3. Separate subject from body with blank line
4. Explain *what* and *why*, not *how*
5. Reference issue numbers when applicable

---

## Pull Request Process

### Before Submitting

1. **Update Your Branch**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Run All Checks**
   ```bash
   npm run type-check  # Must pass
   npm run lint        # Must pass
   npm test            # Must pass
   npm run build       # Must succeed
   ```

3. **Review Your Changes**
   ```bash
   git diff upstream/master
   ```

### Creating Pull Request

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open Pull Request on GitHub**
   - Use descriptive title following conventional commit format
   - Fill out the PR template completely
   - Link related issues

**PR Title Examples:**
```
feat(globe): add flight animation between locations
fix(auth): resolve profile cache race condition
docs(api): add authentication examples
```

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] All tests passing

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Related issues linked

## Screenshots (if applicable)

## Additional Notes
```

### Review Process

1. **Automated Checks**
   - TypeScript compilation
   - ESLint validation
   - Test suite
   - Build process

2. **Code Review**
   - At least one maintainer approval required
   - Address all review comments
   - Keep discussion respectful and constructive

3. **Merge Requirements**
   - All CI checks passing ✅
   - Approved by maintainer ✅
   - No merge conflicts ✅
   - Up to date with master ✅

---

## Testing Requirements

### Test Coverage Goals

- **Critical Components**: 90% coverage (Auth, data hooks)
- **Standard Components**: 60% coverage
- **Utilities**: 90% coverage

### Writing Tests

**Component Tests:**
```typescript
// MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders user name correctly', () => {
    const user = { name: 'John Doe' }
    render(<MyComponent user={user} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<MyComponent user={null} loading={true} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

**Hook Tests:**
```typescript
// useFeature.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useFeature } from './useFeature'

describe('useFeature', () => {
  it('fetches data successfully', async () => {
    const { result } = renderHook(() => useFeature())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeDefined()
    })
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific test file
npm test -- MyComponent.test.tsx
```

---

## Documentation

### Code Documentation

**JSDoc for Complex Functions:**
```typescript
/**
 * Calculates distance between two geographic coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Implementation
}
```

**Inline Comments:**
```typescript
// ✅ Good - Explain WHY
// Use debounce to prevent excessive API calls during typing
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
)

// ❌ Bad - Explain WHAT (obvious from code)
// Set loading to true
setLoading(true)
```

### Documentation Files

When adding new features, update:
- **README.md** - If user-facing feature
- **API.md** - If adding/changing API
- **ARCHITECTURE.md** - If architectural change
- **CLAUDE.md** - Add development patterns

---

## Security Guidelines

### Never Commit

- ❌ API keys or secrets
- ❌ `.env` files (use `.env.example` instead)
- ❌ Personal data or credentials
- ❌ Database dumps with real data

### Security Checklist

- [ ] Input validation on all user data
- [ ] SQL injection prevention (use Supabase query builder)
- [ ] XSS prevention (no `dangerouslySetInnerHTML`, careful with `innerHTML`)
- [ ] Authentication checks on protected routes
- [ ] RLS policies on database tables
- [ ] Rate limiting on API endpoints

**Read [docs/SECURITY.md](docs/SECURITY.md) before contributing security-related code.**

---

## Questions?

- **Code Questions**: Open a discussion on GitHub
- **Bug Reports**: Create an issue with reproduction steps
- **Feature Requests**: Open an issue with use case description
- **Security Issues**: Email security@adventurelog.com (do not create public issue)

---

## Attribution

Contributors are recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Project README (for major features)

Thank you for contributing to Adventure Log! 🚀✈️🌍
