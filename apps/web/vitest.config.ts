import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    css: false,
    passWithNoTests: true,
    // lib/env.ts validates at import; give tests a valid public config.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:8787',
      NEXT_PUBLIC_TEMPO_NETWORK: 'testnet',
      NEXT_PUBLIC_SMARTROUTER_PAYEE: '0x0000000000000000000000000000000000000001',
      NEXT_PUBLIC_USDCE_ADDRESS: '0x0000000000000000000000000000000000000002',
      NEXT_PUBLIC_FEE_BPS: '1000',
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
