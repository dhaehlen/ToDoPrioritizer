# ADR-0006: IndexedDB through Dexie, behind a `TodoRepository` interface

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. Claude recommended it and the user agreed. Claude made
  the interface and implementation details.

## Context

Data stays in the browser ([ADR-0002](0002-local-only-single-user-web-app.md)).
Each change must save completely or not at all (NFR-5), changes should show in
both views at once, and a backend might be added someday.

## Decision

- Store todos in **IndexedDB through Dexie 4**, with one table:
  `todos: 'id, createdAt'`.
- **Everything goes through `TodoRepository`**, which has `getAll`, `get`,
  `put`, `delete`, and `subscribe`. There are two implementations: Dexie for
  the app, and an in-memory one for tests.
- **`subscribe` sends the whole list** right after subscribing and after
  every change, using Dexie's `liveQuery`. That includes changes made in other
  tabs.
- **The app loads every todo and filters in memory.** IndexedDB can't index
  booleans or `null`, so `isCompleted` and `quadrant` aren't indexed. At 1,000
  todos this is cheap.
- **Both implementations pass one shared contract suite**
  (`TodoRepository.contract.ts`).

## Consequences

- Each `put` or `delete` is a single transaction, which covers NFR-5.
- A backend can be added by writing another implementation of the interface.
- Every change re-reads and re-checks all todos. That's fine at the target
  size, but wouldn't scale to very large lists.
- Each action reads, changes, then writes a todo, with no transaction around
  all three steps. If two tabs change the same todo at once, the last write
  wins. That's acceptable for one user.
- Tests: Dexie's `liveQuery` only works if the IndexedDB classes exist as
  globals when Dexie loads. So `fake-indexeddb/auto` is installed globally in
  the test setup, and each test still gets its own fresh database.

## Alternatives considered

- **`localStorage`:** simpler, but it saves the whole list as one string,
  blocks the page while doing so, and has no per-record writes. Rejected.
- **Raw IndexedDB:** too much boilerplate, and no live queries. Rejected.
- **Sending only the changes from `subscribe`:** more complex, and not needed
  at this size.
