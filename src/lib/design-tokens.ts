// Adventure Log design tokens and utility classes

export const designTokens = {
  // Spacing (4px grid system)
  spacing: {
    xs: '4px',   // 1 unit
    sm: '8px',   // 2 units
    md: '12px',  // 3 units
    lg: '16px',  // 4 units
    xl: '20px',  // 5 units
    '2xl': '24px', // 6 units
    '3xl': '32px', // 8 units
    '4xl': '40px', // 10 units
    '5xl': '48px', // 12 units
  },

  // Border radius
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Typography
  typography: {
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },

  // Colors
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    red: {
      500: '#ef4444',
      600: '#dc2626',
    }
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  }
}

// Adventure Log component utilities
export const appStyles = {
  // Photo grid (square aspect ratio)
  photoGrid: 'aspect-square object-cover',

  // Card styles (minimal borders, subtle shadows)
  card: 'bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-sm rounded-lg',

  // Button styles
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold rounded-lg transition-colors',
    ghost: 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors',
  },

  // Text styles
  text: {
    heading: 'font-bold text-gray-900 dark:text-gray-100',
    subheading: 'font-semibold text-gray-800 dark:text-gray-200',
    body: 'text-gray-700 dark:text-gray-300',
    caption: 'text-sm text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
  },

  // Layout utilities
  layout: {
    container: 'mx-auto max-w-6xl px-4',
    section: 'py-6 md:py-8',
    grid: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    photoGrid: 'grid grid-cols-3 gap-1 sm:gap-2 md:grid-cols-4 lg:grid-cols-5',
    mobileOnly: 'block md:hidden',
    desktopOnly: 'hidden md:block',
    tabletUp: 'hidden md:block',
  },

  // Responsive breakpoint utilities
  responsive: {
    mobile: 'max-w-sm',
    tablet: 'max-w-2xl',
    desktop: 'max-w-6xl',
    wide: 'max-w-7xl',
  },

  // Interactive elements
  interactive: {
    touchTarget: 'min-h-12 min-w-12', // 48px minimum for touch
    hover: 'hover:scale-105 transition-transform duration-200',
    active: 'active:scale-95 transition-transform duration-100',
  },

  // Borders and dividers
  borders: {
    light: 'border-gray-200/50 dark:border-gray-700/50',
    medium: 'border-gray-300 dark:border-gray-600',
    strong: 'border-gray-400 dark:border-gray-500',
  }
}

// Legacy export for backward compatibility - will be removed in future version
export const instagramStyles = appStyles

// Helper function to merge app styles with custom classes
export function appClass(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Legacy export for backward compatibility
export const instagramClass = appClass