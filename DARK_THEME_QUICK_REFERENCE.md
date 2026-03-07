# Dark Theme Quick Reference Guide

## Using Dark Theme Colors

### Background Colors
```tsx
// Primary background (darkest)
className="bg-white dark:bg-[#0A1628]"

// Card backgrounds
className="bg-white dark:bg-[#1A2332]"

// Card light variant
className="bg-white dark:bg-[#1E293B]"

// Hover states
className="hover:bg-gray-100 dark:hover:bg-gray-800/50"
```

### Text Colors
```tsx
// Primary text (highest contrast)
className="text-gray-900 dark:text-white"

// Secondary text
className="text-gray-700 dark:text-gray-300"

// Muted text
className="text-gray-500 dark:text-gray-400"

// Very muted
className="text-gray-400 dark:text-gray-500"
```

### Accent Colors
```tsx
// Primary accent (teal/cyan)
className="text-teal-600 dark:text-teal-400"
className="bg-teal-500 dark:bg-teal-500"

// Follow button (blue)
className="text-blue-600 dark:text-blue-400"
```

### Borders
```tsx
// Subtle borders
className="border-gray-200/50 dark:border-gray-700/30"

// Medium borders
className="border-gray-200 dark:border-gray-700"

// Bottom border (for cards)
className="border-b border-gray-100 dark:border-gray-800/50"
```

### Buttons (Using Design Tokens)
```tsx
import { appStyles } from '@/lib/design-tokens'

// Primary button (teal gradient)
<Button className={appStyles.button.primary}>
  Create Album
</Button>

// Follow button (blue gradient)
<Button className={appStyles.button.follow}>
  Follow
</Button>

// Secondary button
<Button className={appStyles.button.secondary}>
  Cancel
</Button>
```

### Cards
```tsx
import { appStyles } from '@/lib/design-tokens'

// Standard card
<div className={appStyles.card}>
  {/* content */}
</div>

// Flat card
<div className={appStyles.cardFlat}>
  {/* content */}
</div>
```

### Stat Boxes (Community Highlights)
```tsx
// Blue stat box
className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30"

// Purple stat box
className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30"

// Green stat box
className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30"

// Orange stat box
className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30"
```

## Layout Structure

### Sidebar Usage
```tsx
// Sidebar is automatically included in (app)/layout.tsx
// Shows on desktop (>1024px), hidden on mobile
<Sidebar /> // Left navigation

// Suggestions sidebar shows on large desktop (>1280px)
<SuggestionsSidebar /> // Right suggestions
```

### Content Spacing
```tsx
// Main content automatically has proper margins:
// lg:ml-[240px] - Desktop left sidebar
// xl:ml-[280px] - Large desktop left sidebar
// xl:mr-[320px] - Large desktop right sidebar
```

### Navigation Components

#### Mobile/Tablet (<1024px)
- Top Navigation (TopNavigation.tsx)
- Bottom Navigation (BottomNavigation.tsx)
- Floating Action Button

#### Desktop (>1024px)
- Left Sidebar (Sidebar.tsx)
- Right Suggestions Sidebar (>1280px only)

## Common Patterns

### Feed Item Card
```tsx
<div className="bg-white dark:bg-[#1A2332] border-b border-gray-100 dark:border-gray-800/50 rounded-lg overflow-hidden mb-4">
  {/* Header */}
  <div className="px-4 py-3">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">
      Username
    </span>
    <p className="text-xs text-gray-500 dark:text-gray-400">
      Location
    </p>
  </div>

  {/* Image */}
  <div className="relative">
    <Image src={photo} alt="..." />
  </div>

  {/* Actions */}
  <div className="px-4 py-2">
    <button className="hover:bg-gray-100 dark:hover:bg-gray-700">
      <Heart className="text-gray-900 dark:text-white" />
    </button>
  </div>

  {/* Caption */}
  <div className="px-4 pb-3">
    <span className="text-sm text-gray-900 dark:text-gray-100">
      Caption text
    </span>
  </div>
</div>
```

### Icon Buttons with Dark Theme
```tsx
<button className="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600">
  <MessageCircle className="h-6 w-6 text-gray-900 dark:text-white" />
</button>
```

### Search Input
```tsx
<Input
  className={cn(
    "rounded-full border-2",
    isFocused
      ? "border-teal-500 dark:border-teal-400 bg-white dark:bg-[#1E293B]"
      : "border-gray-200/60 dark:border-gray-700/30 bg-gray-50/50 dark:bg-[#1E293B]/50"
  )}
/>
```

### Links with Hover
```tsx
<Link
  href="/path"
  className="text-gray-900 dark:text-white hover:opacity-60 transition-opacity"
>
  Link Text
</Link>

// Muted links
<Link
  href="/path"
  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
>
  Secondary Link
</Link>
```

## Responsive Breakpoints

```tsx
// Hide on mobile, show on desktop
className="hidden lg:block"

// Show on mobile, hide on desktop
className="block lg:hidden"

// Hide on small desktop, show on large desktop
className="hidden xl:block"

// Sidebar widths
className="lg:w-[240px] xl:w-[280px]"

// Main content margins (automatically applied in layout)
className="lg:ml-[240px] xl:ml-[280px] xl:mr-[320px]"
```

## Typography

```tsx
// Headings
className="text-2xl font-bold text-gray-900 dark:text-white"

// Subheadings
className="text-lg font-semibold text-gray-800 dark:text-gray-200"

// Body text
className="text-base text-gray-700 dark:text-gray-300"

// Small text
className="text-sm text-gray-600 dark:text-gray-400"

// Extra small (labels, captions)
className="text-xs text-gray-500 dark:text-gray-400"
```

## Gradients

```tsx
// Logo gradient (teal to cyan)
className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent"

// Active state background
className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/20 dark:to-cyan-500/20"
```

## Shadows

```tsx
// Card shadows
className="shadow-md hover:shadow-xl"

// Focus rings (teal)
className="ring-4 ring-teal-500/10"

// Button shadows
className="shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40"
```

## Testing Checklist

When implementing dark theme on new components:

- [ ] All backgrounds have dark variants
- [ ] Text has sufficient contrast (use WCAG checker)
- [ ] Borders are visible but subtle
- [ ] Hover states work in both themes
- [ ] Icons are visible in dark mode
- [ ] Buttons use appropriate accent colors
- [ ] Links have hover states
- [ ] Focus states are visible
- [ ] Cards have proper spacing and borders
- [ ] Gradients render correctly
- [ ] Tested on mobile and desktop viewports

## Common Mistakes to Avoid

1. ❌ **Don't use absolute colors without dark variants**
   ```tsx
   // Bad
   className="bg-white text-black"

   // Good
   className="bg-white dark:bg-[#1A2332] text-gray-900 dark:text-white"
   ```

2. ❌ **Don't use blue for primary actions (use teal)**
   ```tsx
   // Bad
   className="text-blue-600"

   // Good
   className="text-teal-600 dark:text-teal-400"
   ```

3. ❌ **Don't forget opacity on borders**
   ```tsx
   // Bad
   className="border-gray-700"

   // Good
   className="border-gray-200/50 dark:border-gray-700/30"
   ```

4. ❌ **Don't use generic gray for dark backgrounds**
   ```tsx
   // Bad
   className="dark:bg-gray-900"

   // Good
   className="dark:bg-[#1A2332]"
   ```

## Design Tokens Reference

All design tokens are in `src/lib/design-tokens.ts`:

```typescript
import { appStyles, designTokens } from '@/lib/design-tokens'

// Use appStyles for components
appStyles.card
appStyles.button.primary
appStyles.button.follow
appStyles.text.heading

// Use designTokens for raw values
designTokens.colors.dark.bg.primary
designTokens.colors.teal[500]
```

## Additional Resources

- Full implementation details: `DARK_THEME_IMPLEMENTATION.md`
- Design tokens source: `src/lib/design-tokens.ts`
- Tailwind config: `tailwind.config.ts`
- Global CSS variables: `src/app/globals.css`
