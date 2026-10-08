import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

/**
 * Typography (UI_UX_Brief.md §3), self-hosted via next/font so there is no layout shift.
 * - Space Grotesk: display / hero
 * - Inter: UI / body
 * - JetBrains Mono: prices, balances, latency, code (tabular numerals via `.num`)
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/** Class list to put on <html> so every font variable is available app-wide. */
export const fontVariables = `${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`;
