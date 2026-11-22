# ToDoPrioritizer

A local-only, single-user todo app with a List view and an Eisenhower Matrix view.
React 19 + TypeScript 6 + Vite 8, TanStack Router, Dexie (IndexedDB), @dnd-kit/core,
CSS Modules. No backend, no UI component library.

Read before changing behavior: `docs/REQUIREMENTS.md` (FR/NFR IDs),
`docs/ARCHITECTURE.md`, and `docs/adr/` (why things are the way they are).
Ignore any old Python backend; it is not part of this app.

## Commands

| Task                                                                 | Command                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Everything except e2e (format check, lint, typecheck, unit+coverage) | `npm run check`                                                        |
| Everything                                                           | `npm run check:all`                                                    |
| One unit test file                                                   | `npx vitest run src/path/file.test.ts`                                 |
| e2e while iterating (fast)                                           | `npx playwright test e2e/x.spec.ts --project=chromium --reporter=line` |
| e2e, full (Chromium + WebKit)                                        | `npm run e2e`                                                          |
| Performance budgets (NFR-4)                                          | `npm run e2e:perf`                                                     |

- Iterate on one spec + one browser; run the full e2e matrix once at the end.
- Firefox is disabled in `playwright.config.ts` until the VC++ runtime is installed.
- Pre-commit (husky + lint-staged) runs ESLint/Prettier on staged files and `tsc -b`.
- A Claude Code PostToolUse hook runs Prettier on every file written/edited, so
  don't run Prettier by hand after edits.
- Windows: write files with the Write tool, not bash heredocs (quoting breaks).

## Architecture rules (lint-enforced)

- Layers: `ui/` + `routes/` → `state/` → `domain/`; `state/` → `data/`.
  UI never imports `data/`. Only `main.tsx` picks the real repository. Tests are exempt.
- `domain/` is pure TS: no React/Dexie; clock and id are injected; 100% coverage required.
- `Todo` is a discriminated union (`ActiveTodo | CompletedTodo`); no-op updates return
  the same object reference.
- `TodoService` never throws; it returns `Result` (`validation | notFound | storage`).
- Optimistic UI is keyed on `updatedAt` (`useOptimisticToggle`, `useOptimisticMoves`).
- View state (filter) lives in the URL via Zod `validateSearch`.
- Data schema changes: no migrations during development (ADR-0010).

## UI conventions

- CSS Modules + tokens; combine classes with `cx()` from `src/lib/cx.ts`.
- Dialogs are native `<dialog>` via `ui/components/Dialog`; use `data-autofocus`,
  not React `autoFocus`.
- Keep non-component exports in separate files (React Fast Refresh).
- Matrix cards and list rows use `content-visibility: auto`; anything that overflows a
  card/row needs a `content-visibility: visible` exception (see `.card:has(.movePanel)`).
- Grid columns are `minmax(0, 1fr)`, not `1fr` (ADR-0022).
- Accessibility target is WCAG 2.2 AA; axe runs in `e2e/a11y.spec.ts`. Announcements
  use Unicode quotes (“title”).

## Testing gotchas

- Unit: `fake-indexeddb/auto` is loaded globally in `src/test/setup.ts`; the jsdom
  `<dialog>` polyfill lives there too. Use `renderWithRouter` and the in-memory repo.
- Prefer role-based locators and exact text; `getByText` also matches hidden labels
  and live-region announcements.
- Drag-and-drop e2e: wait for dnd-kit's announcer text before the next key or release.
- Use `click()` (not `check()`) on a checkbox whose row disappears after toggling.
- WebKit doesn't focus buttons on click and skips links on Tab; open dialogs with the
  keyboard in focus tests, and use a conditional `test.skip` where needed.
- No fixed sleeps; wait on visible signals or `expect.poll`.
- Before relying on performance, test with ~1,000 todos (see `e2e/nfr4.perf.spec.ts`).

## Process

- Record significant decisions with the `/adr` skill when they are made.
- Before upgrading TypeScript/ESLint majors, check typescript-eslint and
  eslint-plugin-jsx-a11y support (ADR-0018).
