# ADR-0014: Drag-and-drop with `@dnd-kit/core`

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Both. dnd-kit was in the approved plan. Claude chose the
  version and designed the sensors and keyboard behavior.

## Context

FR-14 asks for moving todos between five targets: Q1–Q4 and Unsorted. It must
work with a mouse, touch, and the keyboard, and screen readers need to hear
what's happening (NFR-2).

## Decision

- Use **`@dnd-kit/core` 6**, the stable release, with a `DndContext`. There
  are five drop targets, with ids `Q1`–`Q4` and `unsorted`.
- **Custom sensors:**
  - **Mouse or pen:** pressing anywhere on a card and moving 6 px starts a
    drag.
  - **Touch:** a 250 ms long press starts a drag, so swiping still scrolls the
    page.
  - Presses on a card's own controls never start a drag (`startsDrag`).
  - **Keyboard:** only a dedicated drag handle responds, so Space in the
    checkbox doesn't start a drag.
- **Keyboard movement:** a custom `jumpBetweenTargets` makes the arrow keys
  jump to the nearest target in that direction. It starts from the sensor's
  `currentCoordinates`, because `context.over` lags behind when keys are
  pressed quickly. This bug was found by e2e tests.
- **Collision detection:** the target under the pointer wins
  (`pointerWithin`). With the keyboard, it falls back to `rectIntersection`.
- **Dragging:** a `DragOverlay` shows a preview, with no drop animation, and
  the moved card appears in its new quadrant right away
  ([ADR-0012](0012-optimistic-ui.md)).
- **Screen-reader announcements** use todo titles and quadrant names.

## Consequences

- Mouse, touch, and keyboard dragging are all covered by e2e tests in
  Chromium and WebKit.
- dnd-kit decides the drop target one render late, so releasing at the exact
  instant the pointer arrives can drop the card on the previous target. People
  see the highlight before letting go, and the e2e tests wait for the
  "is over …" announcement before releasing.
- dnd-kit starts listening for keys a moment after pick-up. The keyboard
  tests wait for each announcement before pressing the next key.
- A non-drag alternative is still needed; see
  [ADR-0015](0015-move-select-per-card.md), superseded by
  [ADR-0020](0020-on-demand-move-menu.md).

## Alternatives considered

- **`@dnd-kit/react` 0.x:** actively developed but pre-1.0. Rejected for now.
- **Native HTML5 drag-and-drop:** no keyboard support, and poor on touch
  screens. Rejected.
- **dnd-kit's default keyboard movement** (a few pixels per key press): slow
  and imprecise for choosing one of five targets. Replaced.
