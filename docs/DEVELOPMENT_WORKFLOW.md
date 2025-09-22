# Adventure Log - Development Workflow

## Quick Start Commands
```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server

# Code Quality
npm run lint                   # ESLint check
npm run type-check             # TypeScript check
npm run format                 # Prettier format

# Testing
npm run test                   # Unit tests with Vitest
npm run test:watch             # Watch mode tests
npm run test:e2e               # Playwright E2E tests

# Database
npm run db:generate            # Generate TypeScript types
npm run db:reset               # Reset local database
npm run db:seed                # Seed with test data
```

## Git Workflow
```bash
# Feature development
git checkout -b feature/album-creation
# ... make changes
git add .
git commit -m "feat: add album creation form"
git push origin feature/album-creation
# Create PR
```

## Commit Message Format
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `style:` Code style (formatting, semicolons)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Environment Setup
```bash
# Clone repository
git clone [repo-url]
cd adventure-log

# Install dependencies
npm install

# Environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Database setup
# Run the SQL from DATABASE_SCHEMA.md in Supabase

# Start development
npm run dev
```

## Testing Strategy
- **Unit Tests**: Business logic and utilities
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user journeys
- **Visual Tests**: Component rendering and responsive design

## Code Review Checklist
☐ Follows coding standards
☐ Includes appropriate tests
☐ Performance considerations addressed
☐ Security best practices followed
☐ Accessibility requirements met
☐ Mobile responsive design
☐ Error handling implemented
☐ Loading states included