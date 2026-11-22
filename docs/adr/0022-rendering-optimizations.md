# ADR-0022: `content-visibility` and `minmax(0, 1fr)` for large lists

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Claude, based on a CPU profile and a rendering trace

## Context

Even with the card limit ([ADR-0021](0021-quadrant-card-limit.md)), switching
to the Matrix took about 260–330 ms on a throttled laptop. A CPU profile
showed most of that time in the browser's own work, not in React. A rendering
trace pinned it down to about **100 ms of layout** per switch:

- `1fr` grid columns are `minmax(auto, 1fr)`, which makes the browser measure
  the minimum content width of every card, including laying out the text of
  each title.
- Cards and rows that were off screen were still laid out and painted.

## Decision

- Use **`minmax(0, 1fr)`** instead of `1fr` for the Matrix, its layout, its
  cards, and the List rows.
- Add **`content-visibility: auto`**, with `contain-intrinsic-size`, to Matrix
  cards and List rows. The browser then skips layout and paint for those off
  screen. They stay in the accessibility tree and in find-in-page.
- **`.card:has(.movePanel)`** sets `content-visibility: visible` while a Move
  menu is open. Otherwise the paint containment that comes with
  `content-visibility: auto` clips the menu. The e2e tests caught this; the
  jsdom tests could not.

## Consequences

| Measurement          | Before      | After       |
| -------------------- | ----------- | ----------- |
| Switch to the Matrix | ~260–330 ms | ~64–149 ms  |
| Change the filter    | ~170–200 ms | ~55–137 ms  |
| Cold loads           | ~470–650 ms | ~200–300 ms |

- Any future element that overflows a card or row needs the same
  containment exception as the Move menu.
- `content-visibility` needs a recent browser. All engines the app targets
  support it.

## Alternatives considered

- **Virtualizing the lists:** more code, and complex with drag-and-drop. Not
  needed after this change.
- **Lowering the card limit:** a worse UX, for a smaller gain than this fix.
  Rejected.
