import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // Must come before the React plugin: it generates src/routeTree.gen.ts
    // and code-splits each route file.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/routeTree.gen.ts', 'src/main.tsx'],
    },
  },
});
