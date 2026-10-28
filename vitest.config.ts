import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Separate from vite.config.ts so tests don't load Tailwind/Sentry plugins or need build env.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,mjs}'],
    environment: 'node',
    setupFiles: ['src/i18n/test-setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Static game data tables and type-only declarations carry no logic to test.
      exclude: ['src/**/*.test.{ts,tsx}', 'src/assets/**', 'src/common/types/**', 'src/**/*.d.ts'],
    },
  },
});
