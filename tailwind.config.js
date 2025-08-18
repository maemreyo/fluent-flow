/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './**/*.{ts,tsx,html}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    '!./node_modules/**/*'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color palette for Chrome Extension
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
          950: '#172554'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d'
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309'
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }]
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'extension': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'extension-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugin for Chrome Extension specific utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.extension-popup': {
          width: '400px',
          minHeight: '500px',
          maxHeight: '600px'
        },
        '.extension-sidepanel': {
          width: '100%',
          minHeight: '100vh'
        },
        '.extension-options': {
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem'
        },
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '6px'
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          background: '#f1f5f9'
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          background: '#cbd5e1',
          borderRadius: '3px'
        }
      }
      addUtilities(newUtilities)
    }
  ]
}