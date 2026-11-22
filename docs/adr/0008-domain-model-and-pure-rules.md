# ADR-0008: Todo type enforces completion; pure rules

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Claude

## Context

The requirements state a rule that must always hold: `completedAt` is set if
and only if `isCompleted` is true (§3.1, NFR-5). Edits must never change
`createdAt` or `completedAt` (FR-2, AC-2). Titles are limited to 200
characters, and descriptions to 2,000.

## Decision

- **`Todo` is a union of two types**, `ActiveTodo` (`completedAt: null`) and
  `CompletedTodo` (`completedAt: IsoUtc`). A todo that breaks the rule doesn't
  compile, and a test with `@ts-expect-error` proves it. All fields are
  `readonly`.
- **The rules are pure functions** in `todo.rules.ts`: `createTodo`,
  `editTodo`, `completeTodo`, `reopenTodo`, and `assignQuadrant`. The current
  time and new ids are passed in as arguments.
- **A change that does nothing returns the same object.** Callers can then
  skip the write, and `updatedAt` isn't bumped.
- **Validation returns a `Result` listing every error**, not just the first.
- **Lengths count the characters a user sees** (grapheme clusters, via
  `Intl.Segmenter`), so 👨‍👩‍👧 counts as one. Titles and descriptions are trimmed.
- **Timestamps are ISO-8601 UTC strings**, which also sort correctly as text.

## Consequences

- The tests can use a fixed clock and fixed ids, and the domain layer has 100%
  coverage.
- Skipping no-op writes avoids pointless saves, such as when a todo is dropped
  on the quadrant it's already in.
- Counting graphemes means the HTML `maxLength` attribute can't be used,
  because it counts UTF-16 code units.

## Alternatives considered

- **A single interface with an optional `completedAt`:** the rule would only
  hold by convention. Rejected.
- **Counting `string.length` or code points:** wrong for emoji and combining
  accents. The lint rule `no-misused-spread` pointed this out. Rejected.
- **Classes with methods:** pure functions on plain data are easier to
  serialize and test.
