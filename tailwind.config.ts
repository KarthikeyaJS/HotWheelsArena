import type { Config } from 'tailwindcss';

/** Token colour backed by an RGB-triplet CSS variable so `/opacity` modifiers work. */
const token = (name: string): string => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        card: token('card'),
        'card-hover': token('card-hover'),
        fg: token('text'),
        muted: token('muted'),
        line: token('border'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        'on-accent': token('on-accent'),
        'accent-2': token('accent-2'),
        danger: token('accent-2'),
        'danger-ink': token('danger-ink'),
        metal: token('metal'),
        highlight: token('highlight'),
        'highlight-ink': token('highlight-ink'),
        'on-highlight': token('on-highlight'),
        success: token('success'),
        ring: token('ring'),
      },
      fontFamily: {
        display: ['Orbitron', 'Eurostile', '"Arial Black"', 'system-ui', 'sans-serif'],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      letterSpacing: {
        display: '0.08em',
        hud: '0.16em',
      },
      maxWidth: {
        content: '1280px',
      },
      zIndex: {
        track: '5',
        header: '40',
        overlay: '45',
        drawer: '50',
        modal: '60',
        palette: '65',
        toast: '70',
        scanlines: '90',
      },
      boxShadow: {
        'glow-accent':
          '0 0 0 1px rgb(var(--accent) / 0.45), 0 10px 36px -10px rgb(var(--accent) / 0.6)',
        'glow-highlight':
          '0 0 0 1px rgb(var(--highlight) / 0.5), 0 10px 36px -10px rgb(var(--highlight) / 0.6)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      backgroundImage: {
        'metal-gradient':
          'linear-gradient(135deg, rgb(var(--metal-from)) 0%, rgb(var(--metal-to)) 50%, rgb(var(--metal-from)) 100%)',
        'accent-gradient':
          'linear-gradient(90deg, rgb(var(--accent)) 0%, rgb(var(--accent-2)) 100%)',
        'highlight-gradient':
          'linear-gradient(135deg, rgb(var(--highlight)) 0%, rgb(var(--highlight) / 0.65) 100%)',
      },
      transitionTimingFunction: {
        race: 'cubic-bezier(0.22, 1, 0.36, 1)',
        accelerate: 'cubic-bezier(0.7, 0, 0.84, 0)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'engine-shake': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '15%': { transform: 'translate3d(-1px, 1px, 0)' },
          '30%': { transform: 'translate3d(1.5px, -1px, 0)' },
          '45%': { transform: 'translate3d(-1.5px, 0.5px, 0)' },
          '60%': { transform: 'translate3d(1px, 1px, 0)' },
          '75%': { transform: 'translate3d(-1px, -1px, 0)' },
          '90%': { transform: 'translate3d(0.5px, 0.5px, 0)' },
        },
        'stripe-slide': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left center' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left center' },
        },
        'speed-line': {
          '0%': { transform: 'translate3d(120%, 0, 0)', opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { transform: 'translate3d(-120%, 0, 0)', opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55', filter: 'drop-shadow(0 0 0 rgb(var(--accent) / 0))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgb(var(--accent) / 0.55))' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
        'headlight-flicker': {
          '0%': { opacity: '0' },
          '8%': { opacity: '0.9' },
          '12%': { opacity: '0.15' },
          '20%': { opacity: '1' },
          '26%': { opacity: '0.35' },
          '34%, 100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'fade-in-delayed': 'fade-in 0.3s ease-out 0.2s both',
        shimmer: 'shimmer 1.6s linear infinite',
        'engine-shake': 'engine-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'engine-idle': 'engine-shake 0.9s linear infinite',
        'stripe-slide': 'stripe-slide 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'speed-line': 'speed-line 1.4s linear infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'headlight-flicker': 'headlight-flicker 0.9s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
