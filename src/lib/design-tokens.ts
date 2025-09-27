// Instagram-style design tokens and utility classes

export const designTokens = {
  // Spacing (following Instagram's 4px grid system)
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

  // Shadows (subtle Instagram-style)
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

  // Colors (Instagram-inspired palette)
  colors: {
    primary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
    },
    secondary: {
      50: '#f3e8ff',
      100: '#e9d5ff',
      200: '#d8b4fe',
      300: '#c084fc',
      400: '#a855f7',
      500: '#9333ea',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    accent: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
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
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
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

// Instagram-style component utilities
export const instagramStyles = {
  // Photo grid (square aspect ratio)
  photoGrid: 'aspect-square object-cover rounded-2xl',

  // Card styles (modern, clean design)
  card: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl',

  // Button styles
  button: {
    primary: 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium py-2.5 px-5 rounded-full transition-all duration-200',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-full transition-all duration-200',
    outline: 'border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 font-medium py-2 px-4 rounded-full transition-all duration-200',
  },

  // Text styles
  text: {
    heading: 'font-bold text-gray-900 dark:text-white',
    subheading: 'font-semibold text-gray-900 dark:text-white',
    body: 'text-gray-700 dark:text-gray-300',
    caption: 'text-sm text-gray-600 dark:text-gray-400',
    muted: 'text-xs text-gray-500 dark:text-gray-500',
    link: 'text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors duration-200',
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
  },

  // Layout utilities
  layout: {
    container: 'mx-auto max-w-lg px-4',
    section: 'py-6 md:py-8 space-y-8',
    grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
    photoGrid: 'grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5',
    feedContainer: 'max-w-lg mx-auto bg-gray-50/30 dark:bg-gray-950/30',
    modal: 'bg-white dark:bg-gray-900 rounded-3xl shadow-xl border-0',
  },

  // Responsive breakpoint utilities
  responsive: {
    mobile: 'max-w-sm',
    tablet: 'max-w-lg',
    desktop: 'max-w-4xl',
    wide: 'max-w-6xl',
  },

  // Interactive elements
  interactive: {
    touchTarget: 'min-h-12 min-w-12', // 48px minimum for touch
    hover: 'hover:scale-105 transition-transform duration-200',
    active: 'active:scale-95 transition-transform duration-100',
    scale: 'hover:scale-110 transition-transform duration-300',
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
  },

  // Borders and dividers
  borders: {
    light: 'border-gray-100 dark:border-gray-800',
    medium: 'border-gray-200 dark:border-gray-700',
    strong: 'border-gray-300 dark:border-gray-600',
  },

  // Gradients
  gradients: {
    primary: 'bg-gradient-to-r from-pink-500 to-purple-500',
    secondary: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    accent: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    warm: 'bg-gradient-to-r from-orange-400 to-pink-400',
    cool: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    surface: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
  },

  // States
  states: {
    loading: 'opacity-50 pointer-events-none',
    disabled: 'opacity-40 cursor-not-allowed',
    error: 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20',
    success: 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20',
    warning: 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  },

  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg hover:shadow-xl transition-shadow duration-200',
    xl: 'shadow-xl hover:shadow-2xl transition-shadow duration-200',
  }
}

// Helper function to merge Instagram styles with custom classes
export function instagramClass(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}