/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#141626',
        surface: '#1D2036',
        surface2: '#282C46',
        line: 'rgba(255,255,255,0.15)',
        brand: { purple: '#8B5CF6', pink: '#EC4899' },
        arcade: { cyan: '#06B6D4', red: '#EF4444', green: '#10B981', amber: '#F59E0B' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(139,92,246,.6), 0 0 24px rgba(139,92,246,.35)',
        'neon-cyan': '0 0 0 1px rgba(6,182,212,.6), 0 0 24px rgba(6,182,212,.35)',
        'neon-red': '0 0 0 1px rgba(239,68,68,.7), 0 0 28px rgba(239,68,68,.45)',
        'neon-green': '0 0 0 1px rgba(16,185,129,.6), 0 0 24px rgba(16,185,129,.35)',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-8px)' },
          '40%,80%': { transform: 'translateX(8px)' },
        },
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        rise: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        floatUp: { '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(-140px)', opacity: '0' } },
        glow: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
        flip: { '0%': { transform: 'rotateY(90deg)', opacity: '0' }, '100%': { transform: 'rotateY(0)', opacity: '1' } },
      },
      animation: {
        shake: 'shake .4s ease-in-out',
        pop: 'pop .35s ease-out both',
        rise: 'rise .35s ease-out both',
        floatUp: 'floatUp 1.6s ease-out forwards',
        glow: 'glow 1.6s ease-in-out infinite',
        flip: 'flip .45s ease-out both',
      },
    },
  },
  plugins: [],
};
