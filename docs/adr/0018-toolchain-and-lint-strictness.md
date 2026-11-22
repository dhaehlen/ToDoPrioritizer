# ADR-0018: Toolchain versions and lint strictness

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. The user approved installing Node and asked for the
  Playwright lint rules. Claude chose the versions and the lint setup.

## Context

The machine had no Node.js. The newest tool versions don't all work together
yet. The plan called for strict typing and lint-enforced layers
([ADR-0007](0007-layered-architecture.md)).

## Decision

- **Node 26 LTS**, installed with winget and recorded in `.nvmrc`.
  `engines` is `>=24`.
- **TypeScript 6.0**, not 7: typescript-eslint only supports versions below
  6.1.
- **ESLint 10.** jsx-a11y doesn't officially list ESLint 10 yet, so it's
  allowed through an npm `overrides` entry. Its rules were checked to work.
  ESLint 9 was rejected because it is end-of-life.
- **Lint rules:**
  - typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`
  - react-hooks and react-refresh
  - jsx-a11y
  - `@tanstack/eslint-plugin-router`
  - `eslint-plugin-playwright`, for `e2e/**` only
  - `eslint-config-prettier`
  - layer boundaries through `no-restricted-imports`
- **Prettier:** single quotes, a 100-character line width, and LF line
  endings set in `.gitattributes`.

## Consequences

- The strict rules found real problems: an emoji-splitting string spread,
  promises that were never awaited, and Playwright's flaky `networkidle`
  wait.
- When typescript-eslint supports TypeScript 7, upgrade and remove the
  jsx-a11y override once jsx-a11y supports ESLint 10.
- On this machine, Git Bash may need `C:\Program Files\nodejs` added to its
  `PATH` in shells opened before Node was installed.

## Alternatives considered

- **TypeScript 7:** blocked by typescript-eslint support.
- **ESLint 9:** end-of-life.
- **The `eslint-plugin-jsx-a11y-x` fork:** less established. Rejected in favor
  of the override.
