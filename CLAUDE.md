# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Adventure Log is a comprehensive social travel logging platform built with Next.js 15, featuring trip logging, photo albums, social interactions, and gamification elements. Users can track their travels on an interactive 3D globe, share experiences, and earn badges for their adventures.

## Core Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth and credentials
- **UI**: Radix UI components with Tailwind CSS
- **3D Visualization**: React Three Fiber for the interactive globe
- **State Management**: TanStack Query for server state
- **File Storage**: Supabase for photo uploads

### Key Directory Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components organized by purpose:
  - `ui/` - Base Shadcn/UI components
  - `features/` - Feature-specific components
  - `layout/` - App layout components
  - `providers/` - Context providers
- `lib/` - Core utilities, database, auth, and validation
- `prisma/` - Database schema and migrations
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions

### Database Architecture

The application uses a comprehensive schema with these core entities:

- **User**: Central user profile with travel statistics and social features
- **Trip**: Individual travel entries with location, photos, and journal content
- **Album**: Photo collections for organizing travel memories
- **Social Features**: Follow system, likes, comments, friend requests
- **Gamification**: Badges, challenges, user achievements
- **Activities**: User activity tracking and notifications

## Common Development Commands

### Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint with auto-fix
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Database Operations

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Create and apply migration
npm run db:seed      # Seed database with initial data
npm run db:reset     # Reset database and run migrations
```

## Development Guidelines

### Path Aliases

- Use `@/` prefix for imports (configured in tsconfig.json)
- Example: `import { Button } from "@/components/ui/button"`

### Component Architecture

- UI components follow Shadcn/UI patterns with Radix primitives
- Feature components are organized by domain (trips, albums, social, etc.)
- Use React Hook Form with Zod validation for forms
- Implement proper loading and error states with TanStack Query

### Authentication & Authorization

- NextAuth.js handles authentication with JWT strategy
- Session data includes user ID, email, name, image, and username
- Protected routes should check for session in middleware.ts
- Database operations should validate user permissions

### Database Patterns

- Use Prisma Client via the `db` instance from `lib/db.ts`
- Follow the established schema relationships
- Implement soft deletes where appropriate
- Use transactions for multi-table operations

### Styling Conventions

- Use Tailwind CSS utility classes
- Follow established design tokens from the theme
- Implement responsive design with mobile-first approach
- Use CSS variables for theme customization

### Type Safety

- All API routes should have proper TypeScript interfaces
- Use Zod schemas for validation (see `lib/validations.ts`)
- Leverage Prisma's generated types for database operations
- Extend NextAuth types in `types/next-auth.d.ts`

## Key Features Architecture

### Interactive Globe

- Built with React Three Fiber and Three.js
- Displays visited countries and travel statistics
- Located in `components/globe/` directory

### Social Features

- Follow/unfollow system with friend requests
- Like and comment system for trips and albums
- Activity feed and notifications
- Privacy controls (PUBLIC, FRIENDS_ONLY, PRIVATE)

### Gamification System

- Badge system with categories and rarity levels
- Challenge system with time-based goals
- Progress tracking and achievement unlocking
- Points and streak calculation

### File Upload

- Supabase integration for photo storage
- Support for trip photos and album photos
- Metadata extraction and storage
- Image optimization and resizing

## Environment Variables Required

- `DATABASE_URL` - SQLite database connection
- `NEXTAUTH_URL` - Application URL for NextAuth
- `NEXTAUTH_SECRET` - NextAuth encryption secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- Supabase configuration for file uploads

## Testing & Quality

- ESLint configuration extends Next.js and Prettier rules
- TypeScript strict mode enabled
- Always run `npm run type-check` before commits
- Use `npm run lint` to fix formatting issues
