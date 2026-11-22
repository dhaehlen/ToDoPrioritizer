# ADR-0011: One shared `TodoStore` and a `TodoService` that never throws

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Claude. This refines the original plan, which had components
  calling `useSyncExternalStore` on the repository directly.

## Context

Both views need the same up-to-date list (FR-16), and switching between them
shouldn't show "loading" again. Storage can fail, for example in private
browsing. React StrictMode mounts, cleans up, and mounts again in
development.

## Decision

- **`TodoStore` is the only thing that subscribes to the repository**, once
  per tab. It holds `{ status, todos, loadError, saveError }`, and its
  `subscribe`/`getSnapshot` pair works with `useSyncExternalStore`.
  - Its storage subscription stays open while views mount and unmount.
  - `stop()` closes it, and the next listener restarts it. This is what
    StrictMode needs.
  - If storage fails, the status becomes `error`, the last list that loaded is
    kept, and the store tries again after 2 s.
- **`TodoService`** holds the use cases. Each one reads the todo, applies a
  domain rule, and saves the result, skipping the save when nothing changed.
  **Methods never throw.** They return a `Result` with an error `kind` of
  `validation`, `notFound`, or `storage`. Storage failures also set
  `saveError`, which the error banner shows.
- **`TodoProvider`** creates exactly one store and one service from whichever
  repository it's given.
- **Hooks:** `useTodos()` and `useTodoActions()`, which also reports `pending`.
- **No Redux or Zustand.**

## Consequences

- The List and Matrix can never disagree. Each change triggers one storage
  read, not one per component.
- Components handle expected failures as values. For example, a form shows
  validation errors next to its fields and stays open if a save fails.
- `useTodoInteractions` builds on this so both views share the same dialogs,
  toggling, moving, and announcements.

## Alternatives considered

- **Each component subscribing to the repository:** more storage reads, and
  the views could briefly disagree. Rejected.
- **A store that shuts down for good on cleanup:** broke under StrictMode in
  development. Rejected for a restartable `stop()`.
- **A state library:** not needed for one list.
