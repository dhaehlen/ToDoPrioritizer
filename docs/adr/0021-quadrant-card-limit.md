# ADR-0021: Show 50 cards per quadrant, then "Show N more"

- **Status:** Accepted. Revisit, because it may no longer be needed after
  [ADR-0022](0022-rendering-optimizations.md).
- **Date:** 2026-11-21
- **Deciders:** User. Claude offered three options and recommended this one.

## Context

After [ADR-0020](0020-on-demand-move-menu.md), drawing 800 draggable cards
still took about 370–420 ms, against a 200 ms budget for switching views
([ADR-0019](0019-nfr4-performance-budgets.md)).

## Decision

Each quadrant, and the Unsorted tray, shows its first **50** cards
(`CARD_LIMIT` in `ui/matrix/limits.ts`). Below them is a **"Show N more"**
button, which `aria-expanded` and becomes "Show fewer" once expanded. The
count in each heading always includes **every** todo. Dropping a card into a
quadrant works whether or not the quadrant is expanded. This was added to the
requirements as **FR-17a**.

## Consequences

- At most 250 cards are drawn when the Matrix opens.
- A dropped or moved card can land beyond the first 50 and be hidden until
  the user selects "Show N more". The count and the announcement still confirm
  the move.
- **Revisit:** with the later layout fixes
  ([ADR-0022](0022-rendering-optimizations.md)), the Matrix might be fast
  enough without the limit. Measure with `npm run e2e:perf` and raise or
  remove the limit if every budget still passes.

## Alternatives considered

- **Accepting a larger Matrix budget** (about 500 ms) with no UI change:
  rejected by the user.
- **Virtualizing the lists:** scales best, but it's risky with drag-and-drop
  between scrolling containers. Rejected for now.
