import { defineConfig, devices } from '@playwright/test';

/**
 * Performance checks (NFR-4), run with `npm run e2e:perf`.
 *
 * They run against the production build (`vite preview`), not the dev
 * server, which serves unbundled modules and would distort load times. They
 * also run one at a time, in one browser, so other tests don't compete for
 * the CPU while timing.
 */
const PORT = '4179';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.perf.spec.ts',
  fullyParallel: false,
  workers: 1,
  // Timings on a laptop can be ~2.5× slower across a whole run when other
  // processes compete for the CPU (measured: view switch 103 ms vs ~275 ms with
  // identical code). A failing test is re-measured up to twice. A real
  // regression still fails every attempt, and a pass on retry is reported as
  // "flaky", so it stays visible.
  retries: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Always build fresh, so the numbers are for the current code.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
