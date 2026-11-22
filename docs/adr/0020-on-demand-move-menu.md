# ADR-0020: A "Move" menu that renders its choices only when opened

- **Status:** Accepted. Supersedes [ADR-0015](0015-move-select-per-card.md).
- **Date:** 2026-11-21
- **Deciders:** Claude, based on profiling. The user was told about the UI
  change.

## Context

A test with a variant removed showed that the `<select>` on each card
([ADR-0015](0015-move-select-per-card.md)) was the single biggest cost when
switching to the Matrix:

| Variant                        | Time to switch to the Matrix |
| ------------------------------ | ---------------------------- |
| With a `<select>` on each card | 744 ms                       |
| Without it                     | 230 ms                       |

## Decision

Replace the `<select>` with a **"Move" button** (`QuadrantPicker`) that uses
the **disclosure pattern**:

- `aria-expanded` and `aria-controls`.
- When open, it shows a `role="group"` labeled "Move “title” to", containing
  one button for each **other** quadrant. The choices exist only while the
  menu is open.
- Opening it focuses the first choice. Escape, or a press outside, closes it.
  Escape and choosing a quadrant return focus to "Move".

## Consequences

- With 1,000 todos, the switch went from 1,024 ms to 417 ms, before the other
  fixes.
- It's still two interactions (NFR-1), and it works with the keyboard and
  screen readers.
- The menu overflows its card, so it needs `content-visibility` switched off
  while open ([ADR-0022](0022-rendering-optimizations.md)).

## Alternatives considered

- **A `<select>` whose options are added when it gets focus:** the browser may
  open the dropdown before React adds the options. Rejected.
- **A full ARIA menu with arrow-key focus movement:** more code, for no real
  benefit over a disclosure here.
- **Moving Edit and Delete into the same menu:** fewer elements, but more
  clicks for common actions. Not needed.
