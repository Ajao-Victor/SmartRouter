import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 is CSS-first: the theme (colours, type scale, glows, animations),
 * custom variants (`hocus`, `motion-ok`, `reduced`, `light`, `selected`, `streaming`)
 * and the futuristic utilities (`glass`, `text-beam`, `conic-border`, `bg-field-fallback`,
 * `glitch-text`, `dock-float`, z-index contract …) live in `app/globals.css` and
 * `styles/tokens.css`. This file only scopes content detection.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
};

export default config;
