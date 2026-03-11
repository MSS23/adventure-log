// Adventure Log design tokens and utility classes - Warm Expedition theme

export const designTokens = {
  // Spacing (4px grid system)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
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

  // Enhanced shadows - warmer tones
  shadows: {
    none: 'none',
    sm: '0 1px 3px 0 rgba(28, 25, 23, 0.04), 0 1px 2px 0 rgba(28, 25, 23, 0.02)',
    md: '0 4px 6px -1px rgba(28, 25, 23, 0.06), 0 2px 4px -1px rgba(28, 25, 23, 0.03)',
    lg: '0 10px 15px -3px rgba(28, 25, 23, 0.08), 0 4px 6px -2px rgba(28, 25, 23, 0.04)',
    xl: '0 20px 25px -5px rgba(28, 25, 23, 0.1), 0 10px 10px -5px rgba(28, 25, 23, 0.04)',
    '2xl': '0 25px 50px -12px rgba(28, 25, 23, 0.12)',
    '3xl': '0 35px 60px -15px rgba(28, 25, 23, 0.16)',
    photo: '0 20px 40px -15px rgba(28, 25, 23, 0.25), 0 0 1px rgba(28, 25, 23, 0.08)',
    glow: '0 0 20px rgba(217, 119, 6, 0.25), 0 0 40px rgba(217, 119, 6, 0.1)',
    glowAmber: '0 0 20px rgba(217, 119, 6, 0.3), 0 0 40px rgba(217, 119, 6, 0.15)',
    glowOrange: '0 0 20px rgba(234, 88, 12, 0.3), 0 0 40px rgba(234, 88, 12, 0.15)',
    glowEmerald: '0 0 20px rgba(5, 150, 105, 0.3), 0 0 40px rgba(5, 150, 105, 0.15)',
    glowRose: '0 0 20px rgba(225, 29, 72, 0.3), 0 0 40px rgba(225, 29, 72, 0.15)',
    glass: '0 8px 32px rgba(28, 25, 23, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
    glassElevated: '0 25px 50px -12px rgba(28, 25, 23, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
    lift: '0 20px 40px -15px rgba(28, 25, 23, 0.12), 0 8px 16px -8px rgba(28, 25, 23, 0.08)',
    pressed: '0 2px 4px rgba(28, 25, 23, 0.08), inset 0 1px 2px rgba(28, 25, 23, 0.04)',
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

  // Warm expedition color palette
  colors: {
    // Amber primary
    primary: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    // Orange accent
    accent: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },
    // Earthy green for nature/success
    earth: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    // Warm stone neutrals
    stone: {
      50: '#FAFAF9',
      100: '#F5F5F4',
      200: '#E7E5E4',
      300: '#D6D3D1',
      400: '#A8A29E',
      500: '#78716C',
      600: '#57534E',
      700: '#44403C',
      800: '#292524',
      900: '#1C1917',
      950: '#0C0A09',
    },
    // Dark theme colors
    dark: {
      bg: {
        primary: '#1A1714',
        secondary: '#211E1B',
        card: '#262220',
        cardLight: '#2C2825',
        hover: '#3A3530',
      },
      text: {
        primary: '#FAFAF9',
        secondary: '#D6D3D1',
        muted: '#A8A29E',
      }
    },
    red: {
      500: '#EF4444',
      600: '#DC2626',
    }
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '2560px',
    '4xl': '3840px',
  },

  // Interactive state values
  interactiveStates: {
    scale: {
      pressed: 0.97,
      hover: 1.02,
      active: 0.98,
      bounce: 1.05,
    },
    shadows: {
      rest: '0 1px 3px rgba(28,25,23,0.06)',
      hover: '0 4px 12px rgba(28,25,23,0.12)',
      active: '0 2px 6px rgba(28,25,23,0.1)',
    },
    timing: {
      instant: 100,
      fast: 150,
      normal: 200,
      slow: 300,
    },
  },

  // Animation easing curves
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    snap: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    expressive: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }
}

// Adventure Log component utilities - Warm Expedition theme
export const appStyles = {
  // Photo grid
  photoGrid: 'aspect-square object-cover',

  // Warm card styles
  card: 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300',
  cardHover: 'hover:-translate-y-0.5 hover:shadow-lg',
  cardFlat: 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm rounded-xl',

  // Card variants with warm glass effects
  glassCard: {
    default: 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/50 dark:border-stone-700/30 shadow-lg rounded-2xl',
    glass: 'bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl border border-white/30 dark:border-stone-700/30 shadow-xl rounded-2xl',
    frost: 'bg-gradient-to-br from-white/60 to-white/30 dark:from-stone-900/60 dark:to-stone-900/30 backdrop-blur-lg border border-white/40 dark:border-stone-700/30 rounded-2xl',
    elevated: 'bg-white dark:bg-stone-900 shadow-2xl border border-stone-100 dark:border-stone-800 rounded-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300',
    featured: 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 backdrop-blur-md border-2 border-amber-200/50 dark:border-amber-800/30 rounded-2xl',
    interactive: 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/50 dark:border-stone-700/30 shadow-lg rounded-2xl cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] transition-all duration-300',
  },

  // Button styles with warm accent
  button: {
    primary: 'bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95',
    secondary: 'bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium rounded-lg border border-stone-300 dark:border-stone-600 shadow-sm hover:shadow-md transition-all duration-200',
    follow: 'bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95',
    ghost: 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg transition-all duration-200',
    icon: 'hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full p-2 transition-all duration-200 hover:scale-105 active:scale-95',
  },

  // Text styles with warm stone tones
  text: {
    heading: 'font-bold text-stone-900 dark:text-stone-100 tracking-tight',
    subheading: 'font-semibold text-stone-800 dark:text-stone-200',
    body: 'text-stone-700 dark:text-stone-300 leading-relaxed',
    caption: 'text-sm text-stone-600 dark:text-stone-400',
    muted: 'text-stone-500 dark:text-stone-400',
  },

  // Warm gradient backgrounds
  gradients: {
    sunset: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20',
    warmth: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20',
    forest: 'bg-gradient-to-br from-emerald-50 via-green-50 to-stone-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-stone-950/20',
    earth: 'bg-gradient-to-br from-stone-50 via-amber-50/50 to-stone-100 dark:from-stone-900 dark:via-amber-950/10 dark:to-stone-900',
    sand: 'bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 dark:from-amber-950/20 dark:via-stone-900 dark:to-orange-950/20',
    ocean: 'bg-gradient-to-br from-amber-50 via-sky-50 to-stone-50 dark:from-amber-950/20 dark:via-sky-950/20 dark:to-stone-900',
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

  // Responsive breakpoints
  responsive: {
    mobile: 'max-w-sm',
    tablet: 'max-w-2xl',
    desktop: 'max-w-6xl',
    wide: 'max-w-7xl',
  },

  // Interactive elements
  interactive: {
    touchTarget: 'min-h-12 min-w-12',
    hover: 'hover:scale-[1.02] transition-all duration-300 ease-out',
    active: 'active:scale-[0.98] transition-all duration-100',
    bounce: 'hover:-translate-y-1 transition-transform duration-300 ease-out',
    glow: 'hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-300',
  },

  // Borders
  borders: {
    light: 'border-stone-200/50 dark:border-stone-700/50',
    medium: 'border-stone-300 dark:border-stone-600',
    strong: 'border-stone-400 dark:border-stone-500',
    gradient: 'border-2 border-transparent bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-border',
  },

  // Stat cards - warm themed
  statCard: {
    base: 'relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer group',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border-2 border-amber-200/50 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/15 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800/30',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200/50 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/15 dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-800/30',
    green: 'bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-2 border-emerald-200/50 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/15 dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-800/30',
    rose: 'bg-gradient-to-br from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 border-2 border-rose-200/50 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/15 dark:from-rose-950/30 dark:to-rose-900/20 dark:border-rose-800/30',
    stone: 'bg-gradient-to-br from-stone-50 to-stone-100 hover:from-stone-100 hover:to-stone-200 border-2 border-stone-200/50 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-500/10 dark:from-stone-800/30 dark:to-stone-700/20 dark:border-stone-700/30',
    // Legacy aliases
    blue: 'bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border-2 border-amber-200/50 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/15 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800/30',
    purple: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200/50 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/15 dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-800/30',
    pink: 'bg-gradient-to-br from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 border-2 border-rose-200/50 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/15 dark:from-rose-950/30 dark:to-rose-900/20 dark:border-rose-800/30',
  }
}

// Legacy export for backward compatibility
export const instagramStyles = appStyles

// Helper function to merge app styles with custom classes
export function appClass(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Legacy export
export const instagramClass = appClass
