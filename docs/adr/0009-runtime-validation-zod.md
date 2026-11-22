# ADR-0009: Zod validation at the storage boundary

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Claude

## Context

Anything read from the user's device may be old or corrupted. TypeScript types
disappear at runtime, so they can't check that data. One bad record shouldn't
crash the app, and a bad todo should never be saved. Zod was already used for
URL search params ([ADR-0005](0005-tanstack-router-url-state.md)).

## Decision

- **`todoSchema`** in `data/todoSchema.ts` is a union on `isCompleted`. It
  checks the **shape** of a record, including the completion rule, but **not**
  the domain's length limits.
- **On read:** invalid records are skipped and reported through
  `onInvalidRecord`, which by default calls `console.warn`.
- **On write:** `put` rejects a malformed todo with `InvalidTodoError`, and
  nothing is written.
- **Unknown extra fields are removed**, not rejected.
- **A compile-time check** confirms the schema and the domain `Todo` type
  describe the same thing.

## Consequences

- The app survives corrupted data and keeps showing the valid todos.
- Data saved under looser rules still loads. For example, a 201-character
  title isn't dropped when the limit changes.
- Zod adds to the bundle size. Zod's smaller `zod/mini` build is an option if
  that matters later.

## Alternatives considered

- **Trusting stored data:** one corrupted record could crash every view.
  Rejected.
- **Enforcing the length limits in the schema:** records would silently
  disappear whenever the rules got stricter. Rejected.
- **A strict schema that rejects unknown fields:** data saved by a newer
  version of the app wouldn't load. Rejected.
