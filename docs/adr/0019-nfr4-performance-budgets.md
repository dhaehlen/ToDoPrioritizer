# ADR-0019: Revised performance budgets, and how they're measured

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Both. The user chose separate budgets. Claude designed how
  they're measured.

## Context

NFR-4 originally said: "Each view loads and responds in under 200 ms with
1,000 todos." Measurements against the production build showed that a cold
load can't meet that, whatever the app does:

- With **zero** todos, the app takes about 80–170 ms to start.
- The browser's own IndexedDB `getAll()` of 1,000 records takes about
  70–150 ms before React renders anything.

## Decision

**With 1,000 todos:**

- **Interactions** take under **200 ms**: changing the filter, completing a
  todo, moving a todo, and switching views.
- **A cold page load** of either view takes under **1 s**.

**How it's measured** (`e2e/nfr4.perf.spec.ts`, run with `npm run e2e:perf`):

- **Production build** (`vite preview`) in Chromium, with one worker, kept
  separate from the normal e2e run.
- **Seed data:** 1,000 records written directly into IndexedDB, 800 active and
  200 completed, spread across the quadrants.
- **Timing** happens inside the page with `performance.now()`, until the
  expected elements exist and a frame has been painted.
- **Each number** is the median of 7 runs, after one warm-up run that is
  discarded.
- **Up to 2 retries:** a laptop's whole run can be about 2.5× slower when the
  CPU is throttled. A real regression still fails every attempt, and a pass on
  retry is reported as flaky.

## Consequences

- The budgets are realistic and still catch regressions. The first run found
  three real problems, fixed in [ADR-0020](0020-on-demand-move-menu.md),
  [ADR-0021](0021-quadrant-card-limit.md), and
  [ADR-0022](0022-rendering-optimizations.md).
- Results today: interactions take about 30–150 ms, and cold loads about
  200–300 ms.

## Alternatives considered

- **Measuring only the render**, from data arriving to drawn, against 200 ms:
  this ignores what users actually wait for. Rejected.
- **Keeping 200 ms and recording a known gap:** a test that always fails is
  useless. Rejected.
