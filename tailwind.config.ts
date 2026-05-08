import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Font families
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      // Animation configurations
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'globe-rotate': 'globeRotate 20s linear infinite',
        'photo-zoom': 'photoZoom 0.3s ease-in-out',
        'reveal': 'reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        globeRotate: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        photoZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      // Typography
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      // Aspect ratios
      aspectRatio: {
        '4/3': '4 / 3',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
        'photo': '4 / 3',
        'landscape': '16 / 9',
        'portrait': '3 / 4',
      },
      // Colors extending CSS variables
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Warm expedition colors
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
      },
      // Shadows
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(28, 25, 23, 0.06)',
        'medium': '0 4px 16px 0 rgba(28, 25, 23, 0.1)',
        'hard': '0 8px 32px 0 rgba(28, 25, 23, 0.14)',
        'photo': '0 10px 40px -15px rgba(28, 25, 23, 0.25)',
        'card-hover': '0 20px 25px -5px rgba(28, 25, 23, 0.08), 0 10px 10px -5px rgba(28, 25, 23, 0.03)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(28, 25, 23, 0.04)',
        'warm-glow': '0 0 20px rgba(217, 119, 6, 0.15)',
      },
      // Border radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'base': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
        'photo': '0.75rem',
      },
      // Grid configurations
      gridTemplateColumns: {
        'auto-fill-100': 'repeat(auto-fill, minmax(100px, 1fr))',
        'auto-fill-150': 'repeat(auto-fill, minmax(150px, 1fr))',
        'auto-fill-200': 'repeat(auto-fill, minmax(200px, 1fr))',
        'auto-fill-250': 'repeat(auto-fill, minmax(250px, 1fr))',
        'auto-fill-300': 'repeat(auto-fill, minmax(300px, 1fr))',
        'photo-xs': 'repeat(auto-fill, minmax(120px, 1fr))',
        'photo-sm': 'repeat(auto-fill, minmax(180px, 1fr))',
        'photo-md': 'repeat(auto-fill, minmax(250px, 1fr))',
        'photo-lg': 'repeat(auto-fill, minmax(320px, 1fr))',
      },
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // Z-index
      zIndex: {
        'negative': '-1',
        'auto': 'auto',
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      // Screens for TV/large displays
      screens: {
        '3xl': '2560px',
        '4xl': '3840px',
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-pinch-zoom': {
          'touch-action': 'pinch-zoom',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.stone.300'),
            borderRadius: '3px',
          },
        },
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        '.gpu-accelerated': {
          'transform': 'translateZ(0)',
          'will-change': 'transform',
        },
        '.optimize-legibility': {
          'text-rendering': 'optimizeLegibility',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '.font-heading': {
          'font-family': 'var(--font-playfair), Georgia, serif',
        },
      }

      const newComponents = {
        '.globe-container': {
          position: 'relative',
          overflow: 'hidden',
          borderRadius: theme('borderRadius.lg'),
          minHeight: '300px',
          '@media (max-width: 768px)': {
            minHeight: '250px',
          },
        },
        '.photo-grid': {
          display: 'grid',
          gap: theme('spacing.4'),
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          '@media (min-width: 640px)': {
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          },
          '@media (min-width: 1024px)': {
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          },
        },
        '.mobile-input': {
          fontSize: '16px !important',
        },
        '.card-hover': {
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.card-hover'),
          },
        },
        '.photo-aspect': {
          aspectRatio: '4 / 3',
          overflow: 'hidden',
          borderRadius: theme('borderRadius.photo'),
        },
        '.photo-aspect-landscape': {
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: theme('borderRadius.photo'),
        },
        '.photo-aspect-portrait': {
          aspectRatio: '3 / 4',
          overflow: 'hidden',
          borderRadius: theme('borderRadius.photo'),
        },
        '.shimmer': {
          background: 'linear-gradient(90deg, #F5F5F4 0px, #E7E5E4 40px, #F5F5F4 80px)',
          backgroundSize: '200px',
          animation: 'shimmer 1.5s ease-in-out infinite',
        },
        '.shimmer-dark': {
          background: 'linear-gradient(90deg, #2C2825 0px, #3A3530 40px, #2C2825 80px)',
          backgroundSize: '200px',
          animation: 'shimmer 1.5s ease-in-out infinite',
        },
      }

      addUtilities(newUtilities)
      addComponents(newComponents)
    }),
  ],
}

export default config
