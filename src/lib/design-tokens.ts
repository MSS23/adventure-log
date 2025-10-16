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
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },

  // Enhanced shadows for depth
  shadows: {
    none: 'none',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.06)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    photo: '0 20px 40px -15px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.15)',
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

  // Enhanced travel-focused color palette
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    ocean: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    sunset: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    adventure: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
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
      950: '#030712',
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

  // Enhanced card styles with modern aesthetics
  card: 'bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 shadow-md hover:shadow-xl rounded-2xl transition-all duration-300',
  cardHover: 'hover:-translate-y-1 hover:shadow-2xl',
  cardFlat: 'bg-white dark:bg-gray-900 border border-gray-200/40 dark:border-gray-700/40 shadow-sm rounded-xl',

  // Enhanced button styles
  button: {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 active:scale-95',
    secondary: 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 text-gray-900 dark:text-gray-100 font-semibold rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300',
    ghost: 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200',
    icon: 'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2 transition-all duration-200 hover:scale-110 active:scale-95',
  },

  // Text styles
  text: {
    heading: 'font-bold text-gray-900 dark:text-gray-100 tracking-tight',
    subheading: 'font-semibold text-gray-800 dark:text-gray-200',
    body: 'text-gray-700 dark:text-gray-300 leading-relaxed',
    caption: 'text-sm text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
  },

  // Gradient backgrounds
  gradients: {
    ocean: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50',
    sunset: 'bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50',
    forest: 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50',
    sky: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100',
    warm: 'bg-gradient-to-br from-amber-50 via-orange-50 to-red-50',
    cool: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
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
    hover: 'hover:scale-[1.02] transition-all duration-300 ease-out',
    active: 'active:scale-[0.98] transition-all duration-100',
    bounce: 'hover:-translate-y-1 transition-transform duration-300 ease-out',
    glow: 'hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300',
  },

  // Borders and dividers
  borders: {
    light: 'border-gray-200/50 dark:border-gray-700/50',
    medium: 'border-gray-300 dark:border-gray-600',
    strong: 'border-gray-400 dark:border-gray-500',
    gradient: 'border-2 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-border',
  },

  // Stat cards
  statCard: {
    base: 'relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer group',
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200/50 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/20',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200/50 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/20',
    green: 'bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-2 border-emerald-200/50 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/20',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200/50 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/20',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 border-2 border-pink-200/50 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/20',
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