# ADR-0010: No schema migrations during development

- **Status:** Accepted. Revisit before the first real release.
- **Date:** 2026-11-20
- **Deciders:** User

## Context

Dexie supports versioned schemas with `.upgrade()` migrations. The app is
still in development, and the stored fields are expected to change. The user
said: "don't worry too much about how to handle different versions if it
increases the complexity greatly … good to think about though."

## Decision

During development, **don't write migrations**. Edit `db.version(1)` in place,
or bump the version with no upgrade code, and clear local data if needed.
Mention any compatibility trade-offs instead of building machinery for them.

## Consequences

- Less code and less to maintain while the model is still changing.
- Data saved by older development builds may need to be cleared by hand.
- The Zod check ([ADR-0009](0009-runtime-validation-zod.md)) still protects
  the app from records it doesn't understand: they're skipped, not crashed on.
- **Before the first real release:** switch to adding a
  `db.version(n).upgrade()` step with a test for each schema change.

## Alternatives considered

- **Migrations from the start:** the original plan. Too much ceremony for a
  model that is still changing.
