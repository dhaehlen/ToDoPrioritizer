# ADR-0007: Layered architecture with lint-enforced boundaries

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Claude. Proposed in the architecture plan, which the user
  reviewed and approved.

## Context

The business rules must be easy to test (NFR-6), storage must be replaceable
([ADR-0006](0006-indexeddb-dexie-repository.md)), and both views must always
show the same data.

## Decision

The code is split into four layers. Each may only depend on the layers below
it:

```
ui/ + routes/  →  state/  →  domain/
                     ↓
                   data/
```

| Layer            | What it contains                                                  |
| ---------------- | ----------------------------------------------------------------- |
| `domain/`        | Pure TypeScript: types, rules, and selectors. No React, no Dexie. |
| `data/`          | The repository interface and its implementations.                 |
| `state/`         | `TodoProvider`, `TodoStore`, `TodoService`, and the hooks.        |
| `ui/`, `routes/` | Components and routes. They never import `data/`.                 |

**ESLint's `no-restricted-imports`** enforces these rules per folder. Test
files are exempt, because they set up in-memory storage directly. Only
`main.tsx`, the composition root, chooses the real storage.

## Consequences

- The domain rules have 100% test coverage with no mocks.
- A UI component that reaches into storage fails lint, not code review.
- A few small extra files, such as `todoContext.ts` and `limits.ts`, exist to
  keep the boundaries and React Fast Refresh happy.

## Alternatives considered

- **Components calling Dexie directly**, for example with
  `dexie-react-hooks`: less code, but storage would leak into the UI and be
  hard to replace. Rejected.
- **Enforcing the boundaries by convention only:** they would drift over time.
  Rejected in favor of lint.
