import type { Config } from 'tailwindcss';

/**
 * Colours are declared once, in `src/app/globals.css`, as HSL channel triplets.
 * Everything here just gives them names. Never add a literal colour value to
 * this file or to a component — add a token instead.
 */
const withAlpha = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--sb-accent'),
          soft: withAlpha('--sb-accent-soft'),
          foreground: withAlpha('--sb-accent-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),

        surface: {
          DEFAULT: withAlpha('--sb-surface'),
          muted: withAlpha('--sb-surface-2'),
        },
        ink: {
          DEFAULT: withAlpha('--sb-ink'),
          muted: withAlpha('--sb-ink-2'),
          subtle: withAlpha('--sb-ink-3'),
        },
        line: {
          DEFAULT: withAlpha('--sb-line'),
          strong: withAlpha('--sb-line-2'),
        },
        live: {
          DEFAULT: withAlpha('--sb-live'),
          soft: withAlpha('--sb-live-soft'),
        },
        tag: {
          drive: withAlpha('--sb-tag-drive'),
          'drive-soft': withAlpha('--sb-tag-drive-soft'),
          'low-motivation': withAlpha('--sb-tag-low-motivation'),
          'low-motivation-soft': withAlpha('--sb-tag-low-motivation-soft'),
          celebration: withAlpha('--sb-tag-celebration'),
          'celebration-soft': withAlpha('--sb-tag-celebration-soft'),
          chaos: withAlpha('--sb-tag-chaos'),
          'chaos-soft': withAlpha('--sb-tag-chaos-soft'),
          calm: withAlpha('--sb-tag-calm'),
          'calm-soft': withAlpha('--sb-tag-calm-soft'),
        },
      },
      borderRadius: {
        sm: 'var(--sb-radius-sm)',
        md: 'var(--sb-radius-md)',
        lg: 'var(--sb-radius-lg)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        ui: ['var(--font-ui)', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        panel: '0 1px 3px 0 hsl(var(--sb-ink) / 0.05)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
