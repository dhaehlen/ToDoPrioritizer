# ADR-0015: Native `<select>` on each card to move without dragging

- **Status:** Superseded by [ADR-0020](0020-on-demand-move-menu.md) (2026-11-21)
- **Date:** 2026-11-21 (M5)
- **Deciders:** Claude

## Context

FR-14 and NFR-2 require a way to move a todo between quadrants without
dragging, for keyboard, screen-reader, and touch users.

## Decision

Give every Matrix card a native `<select>` labeled "Move “title” to", with the
options Unsorted and Q1–Q4. Choosing an option moves the todo.

## Consequences

- It's accessible with no custom code and works on every platform.
- **Expensive at scale.** In the M7 performance work, 800 cards meant 800
  `<select>` elements with 4,000 `<option>`s. Rendering them made switching to
  the Matrix take about 1 s. This led to
  [ADR-0020](0020-on-demand-move-menu.md).

## Alternatives considered

- **A custom ARIA menu button:** more code. Chosen later in a lighter
  disclosure form ([ADR-0020](0020-on-demand-move-menu.md)).
