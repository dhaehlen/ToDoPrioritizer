# ADR-0004: React, TypeScript, and Vite

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. Claude recommended this stack and the user agreed.

## Context

The app has no backend ([ADR-0002](0002-local-only-single-user-web-app.md)),
so the stack question is only about the front end. Two parts of it are hard:
keeping the List and Matrix in sync, and drag-and-drop that also works with
the keyboard (NFR-2).

## Decision

- **React** for the UI.
- **TypeScript** in strict mode, also with `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, and `erasableSyntaxOnly`.
- **Vite** for the dev server and the build. Vitest comes from the same
  ecosystem.

## Consequences

- There are good drag-and-drop libraries that support the keyboard, such as
  dnd-kit ([ADR-0014](0014-drag-and-drop-dnd-kit.md)).
- The compiler can enforce domain rules, such as the completion rule in
  [ADR-0008](0008-domain-model-and-pure-rules.md).
- Strict settings cost some ceremony. For example, CSS-module class lookups
  are typed `string | undefined`, so classes are joined with a small `cx()`
  helper.

## Alternatives considered

- **Plain HTML and JavaScript:** no build step, but keeping two views in sync
  by hand gets messy. Rejected.
- **Svelte:** less code, but fewer accessible drag-and-drop options. Rejected.
- **Vue:** no real advantage over React for this app.
