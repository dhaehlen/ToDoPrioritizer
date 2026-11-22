# ADR-0017: Testing strategy

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. The user required Vitest and Playwright, all browser
  engines, and Playwright lint rules. Claude designed the layers of tests, the
  contract suite, and the coverage targets.

## Context

NFR-6 requires automated tests for the business rules. The app depends on
real browser behavior (IndexedDB, `<dialog>`, drag-and-drop, focus) that
jsdom can't reproduce.

## Decision

| Level         | Tools                                  | What it covers                                                                                        |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unit          | Vitest                                 | Domain rules and selectors, with a fixed clock. 100% coverage is enforced.                            |
| Data contract | Vitest + `fake-indexeddb`              | One suite that both repositories must pass.                                                           |
| Component     | Vitest + React Testing Library + jsdom | Views using in-memory storage, through `renderWithRouter`.                                            |
| End-to-end    | Playwright, Chromium + WebKit          | Acceptance criteria (`acceptance.spec.ts`), user flows, keyboard and drag-and-drop, the phone layout. |
| Accessibility | `@axe-core/playwright`                 | See [ADR-0016](0016-accessibility-approach.md).                                                       |
| Performance   | Playwright, own config                 | See [ADR-0019](0019-nfr4-performance-budgets.md).                                                     |

- **Coverage:** at least 80% overall, and 100% for `src/domain`. The coverage
  run fails below these.
- **Lint for tests:** `eslint-plugin-playwright` (recommended rules), plus the
  TypeScript rules that check types. Together they catch, for example, a
  missing `await` or an unawaited promise.
- **Firefox is disabled for now:** on the dev machine it needs the Visual C++
  runtime. The user chose to skip it until that's installed.
- **No fixed sleeps:** tests wait for visible signals, such as dnd-kit's
  announcements, never for a set time.

## Consequences

- Real-browser tests found bugs that jsdom couldn't:
  - the checkbox flicker
  - two filter tabs marked current at once
  - the Move menu clipped by `content-visibility`
  - the arrow keys reading a stale drop target
- The full e2e run takes about 1.5 minutes. Timing tests run separately.
- Each e2e test gets a fresh browser context, so IndexedDB always starts
  empty.

## Alternatives considered

- **Jest:** Vitest shares Vite's config and is faster here.
- **Cypress:** Playwright covers WebKit and is what the user asked for.
- **Testing in Chromium only:** the user chose all engines.
