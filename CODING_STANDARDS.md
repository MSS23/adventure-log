# Adventure Log - Coding Standards

## TypeScript Standards
- **Strict Mode**: Always enabled, no 'any' types
- **Type Inference**: Prefer inference over explicit types when clear
- **Zod Validation**: All user inputs must be validated with Zod schemas
- **Interface over Type**: Use interfaces for object shapes

## React Patterns
- **Server Components**: Default choice for pages and data fetching
- **Client Components**: Only when interactivity needed ('use client')
- **Custom Hooks**: Extract reusable logic into hooks
- **Error Boundaries**: Wrap components that might fail
- **Suspense**: Use for loading states with fallbacks

## File Naming Conventions
- **Components**: PascalCase (e.g., 'AlbumCard.tsx')
- **Hooks**: camelCase starting with 'use' (e.g., 'useAlbums.ts')
- **Utilities**: camelCase (e.g., 'formatDate.ts')
- **Pages**: lowercase with hyphens in URLs
- **Types**: PascalCase interfaces/types

## Component Structure
```typescript
// 1. Imports (grouped: React, libraries, internal)
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAlbums } from '@/lib/hooks/useAlbums';

// 2. Types and Interfaces
interface AlbumCardProps {
  album: Album;
  onEdit?: () => void;
}

// 3. Component Implementation
export function AlbumCard({ album, onEdit }: AlbumCardProps) {
  // 4. Hooks (state, queries, etc.)
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: deleteAlbum } = useDeleteAlbum();

  // 5. Event Handlers
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteAlbum(album.id);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. JSX Return
  return (
    <div className="rounded-lg border p-4">
      {/* Component JSX */}
    </div>
  );
}
```

## CSS and Styling
- **Tailwind CSS**: Primary styling method
- **shadcn/ui**: Use existing components when available
- **Custom CSS**: Only for complex animations or unavoidable cases
- **Mobile First**: All designs start mobile, scale up
- **Consistent Spacing**: Use Tailwind spacing scale (4, 8, 12, 16, etc.)

## API and Data Patterns
- **React Query**: All server state management
- **Optimistic Updates**: For better UX on mutations
- **Error Handling**: Consistent error boundaries and toast notifications
- **Loading States**: Always provide loading feedback
- **Caching**: Strategic cache invalidation with React Query

## Security Rules
- **Input Validation**: Validate everything with Zod
- **RLS First**: Database security at row level
- **No Client Secrets**: Never expose sensitive keys
- **File Upload**: Validate file types and sizes
- **XSS Prevention**: Sanitize user content

## Performance Guidelines
- **Image Optimization**: Always use Next.js Image component
- **Code Splitting**: Dynamic imports for large components
- **Bundle Analysis**: Regular bundle size monitoring
- **Database Queries**: Efficient queries with proper indexes
- **Lazy Loading**: For images and non-critical components

## Accessibility Standards
- **WCAG 2.2 AA**: Minimum compliance level
- **Semantic HTML**: Use proper HTML elements
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 ratio for normal text

## Git and Development
- **Conventional Commits**: Use standard commit message format
- **Feature Branches**: One feature per branch
- **Small Commits**: Atomic commits with clear messages
- **Code Review**: All code must be reviewed before merge
- **Testing**: Unit tests for logic, E2E for user flows