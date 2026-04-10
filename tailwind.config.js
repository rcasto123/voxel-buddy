/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        buddy: {
          bg: '#1a1f2e',
          surface: '#242938',
          border: '#2e3650',
          glow: '#38bdf8',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#38bdf8',
          danger: '#f87171',
        },
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 0.4s ease-in-out 2',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'wave-arm': 'waveArm 0.4s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.25s ease-out',
        'fade-out': 'fadeOut 0.25s ease-in forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.75' },
        },
        waveArm: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-40deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)', opacity: '0.6' },
          '50%': { transform: 'translateY(-5px)', opacity: '0.2' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
