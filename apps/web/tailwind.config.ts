import type { Config } from 'tailwindcss';

// Tokens from docs/08-design-system.md, exposed as CSS variables in globals.css
// and mapped here so Tailwind utilities (bg-tf-primary, text-tf-text, etc.) stay
// centralized instead of hardcoding hex values across components.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tf-bg': 'var(--tf-bg)',
        'tf-surface': 'var(--tf-surface)',
        'tf-surface-raised': 'var(--tf-surface-raised)',
        'tf-primary': 'var(--tf-primary)',
        'tf-primary-ink': 'var(--tf-primary-ink)',
        'tf-text': 'var(--tf-text)',
        'tf-text-muted': 'var(--tf-text-muted)',
        'tf-border': 'var(--tf-border)',
        'tf-danger': 'var(--tf-danger)',
        'tf-warning': 'var(--tf-warning)',
        'tf-success': 'var(--tf-success)',
      },
      borderRadius: {
        'tf-sm': '8px',
        'tf-md': '16px',
        'tf-lg': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
