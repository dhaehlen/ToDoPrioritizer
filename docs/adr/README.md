# Architecture Decision Records

An ADR records one significant decision: the context, what was decided, its
consequences, and the alternatives considered. ADRs are never rewritten after
the fact. When a decision changes, a new ADR supersedes the old one and both
stay in the log.

**Deciders** says who made each call. "User" means the project owner. "Claude"
means the AI pair programmer, which proposed and made decisions during the
build. "Both" means a proposal that the user explicitly accepted.

| #                                                | Decision                                                     | Status                                            | Date       | Deciders |
| ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- | ---------- | -------- |
| [0001](0001-record-architecture-decisions.md)    | Record architecture decisions                                | Accepted                                          | 2026-11-21 | User     |
| [0002](0002-local-only-single-user-web-app.md)   | Local-only, single-user web app with no backend              | Accepted                                          | 2026-11-20 | Both     |
| [0003](0003-v1-product-scope.md)                 | v1 product scope                                             | Accepted                                          | 2026-11-20 | Both     |
| [0004](0004-react-typescript-vite.md)            | React, TypeScript, and Vite                                  | Accepted                                          | 2026-11-20 | Both     |
| [0005](0005-tanstack-router-url-state.md)        | TanStack Router, with view state in the URL                  | Accepted                                          | 2026-11-20 | Both     |
| [0006](0006-indexeddb-dexie-repository.md)       | IndexedDB through Dexie, behind a `TodoRepository` interface | Accepted                                          | 2026-11-20 | Both     |
| [0007](0007-layered-architecture.md)             | Layered architecture with lint-enforced boundaries           | Accepted                                          | 2026-11-20 | Claude   |
| [0008](0008-domain-model-and-pure-rules.md)      | Todo type enforces completion; pure rules                    | Accepted                                          | 2026-11-20 | Claude   |
| [0009](0009-runtime-validation-zod.md)           | Zod validation at the storage boundary                       | Accepted                                          | 2026-11-20 | Claude   |
| [0010](0010-no-migrations-during-development.md) | No schema migrations during development                      | Accepted                                          | 2026-11-20 | User     |
| [0011](0011-single-store-and-service.md)         | One shared `TodoStore` and a `TodoService` that never throws | Accepted                                          | 2026-11-20 | Claude   |
| [0012](0012-optimistic-ui.md)                    | Optimistic updates keyed on `updatedAt`                      | Accepted                                          | 2026-11-20 | Claude   |
| [0013](0013-css-modules-native-dialog.md)        | CSS Modules and native `<dialog>`, no UI library             | Accepted                                          | 2026-11-20 | Both     |
| [0014](0014-drag-and-drop-dnd-kit.md)            | Drag-and-drop with `@dnd-kit/core`                           | Accepted                                          | 2026-11-21 | Both     |
| [0015](0015-move-select-per-card.md)             | Native `<select>` on each card to move without dragging      | Superseded by [0020](0020-on-demand-move-menu.md) | 2026-11-21 | Claude   |
| [0016](0016-accessibility-approach.md)           | Accessibility approach (WCAG 2.2 AA)                         | Accepted                                          | 2026-11-21 | Both     |
| [0017](0017-testing-strategy.md)                 | Testing strategy                                             | Accepted                                          | 2026-11-20 | Both     |
| [0018](0018-toolchain-and-lint-strictness.md)    | Toolchain versions and lint strictness                       | Accepted                                          | 2026-11-20 | Both     |
| [0019](0019-nfr4-performance-budgets.md)         | Revised performance budgets, and how they're measured        | Accepted                                          | 2026-11-21 | Both     |
| [0020](0020-on-demand-move-menu.md)              | A "Move" menu that renders its choices only when opened      | Accepted                                          | 2026-11-21 | Claude   |
| [0021](0021-quadrant-card-limit.md)              | Show 50 cards per quadrant, then "Show N more"               | Accepted (revisit)                                | 2026-11-21 | User     |
| [0022](0022-rendering-optimizations.md)          | `content-visibility` and `minmax(0, 1fr)` for large lists    | Accepted                                          | 2026-11-21 | Claude   |

To add one, copy the structure of an existing ADR, use the next number, and add
a row here.
