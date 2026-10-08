import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 reads its theme from CSS (`@theme` in app/globals.css).
 * This file only scopes content; token mapping lands in Task 3.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
};

export default config;
