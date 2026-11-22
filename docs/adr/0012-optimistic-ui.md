# ADR-0012: Optimistic updates keyed on `updatedAt`

- **Status:** Accepted
- **Date:** 2026-11-20 (checkbox, M4). Extended to drag-and-drop moves on
  2026-11-21 (M5).
- **Deciders:** Claude. The e2e tests found the problem.

## Context

The checkbox is a controlled input, so it snapped back until storage
confirmed the change. Playwright reported "Clicking the checkbox did not
change its state", and users would see a flicker. A card dropped in the
Matrix also jumped back to where it started for a frame. Storage sends fresh
copies of **every** todo whenever **any** todo changes, so an object reference
can't tell you whether a particular todo has been saved.

## Decision

- **`useOptimisticToggle`** (checkbox) and **`useOptimisticMoves`** (quadrant)
  show the new value right away.
- **An override applies only while the todo's `updatedAt` is unchanged.** It
  disappears on its own when the saved todo arrives, because a saved todo has
  a new `updatedAt`.
- **If the save fails, the override is removed**, and the error banner
  explains why.

## Consequences

- There's no flicker, and the UI always ends up matching storage.
- Saves to other todos don't cancel an override early.
- Component tests check that a failed save puts the old state back.

## Alternatives considered

- **No optimistic state:** visible flicker, and it broke Playwright's
  `check()`. Rejected.
- **Keying on the todo object:** any unrelated change would cancel the
  override. Rejected.
- **Changing the store optimistically:** would mix unconfirmed data into the
  shared list. Rejected.
