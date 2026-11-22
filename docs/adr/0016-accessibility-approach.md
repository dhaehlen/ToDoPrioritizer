# ADR-0016: Accessibility approach (WCAG 2.2 AA)

- **Status:** Accepted
- **Date:** 2026-11-21 (M6). This builds on choices made in M4 and M5.
- **Deciders:** Both. NFR-2 (WCAG AA) is a user requirement, and Claude
  designed how to meet and check it.

## Context

NFR-2: the app meets WCAG 2.1 AA, every action can be done with the keyboard,
and color is never the only signal. Automated tools catch only part of the
problems.

## Decision

- **Automated checks:** `e2e/a11y.spec.ts` runs axe with the WCAG 2.0, 2.1,
  and 2.2 A/AA rules, including target size. It covers both views, the open
  dialogs including validation errors, light and dark mode, and desktop and
  phone sizes.
- **Keyboard:**
  - Native controls, and a drag handle with keyboard dragging.
  - A "Move" menu for anyone who doesn't drag.
  - A skip link as the first Tab stop.
  - Focus is managed after deletes and when dialogs close.
- **Screen readers:**
  - A `role="status"` region announces adds, saves, completions, deletes,
    and moves.
  - dnd-kit announcements use todo titles and quadrant names.
  - Validation errors are linked to their fields with
    `aria-invalid`/`aria-describedby`.
  - Each view has its own page title.
- **Not color-only:** each quadrant is named in text and says whether it is
  urgent and important.
- **Comfort:** controls are at least 40 px tall on touch screens, and
  animations turn off when the user asks for reduced motion.
- **Browser-specific skips** are allowed only when they're conditional and
  give a reason. For example, WebKit, like Safari, skips links on Tab by
  default.

## Consequences

- An accessibility regression fails CI.
- A few behaviors can only be tested in real browsers (Escape, focus
  trapping, the skip link) and are covered by e2e tests.

## Alternatives considered

- **Manual review only:** regressions would slip through. Rejected.
- **Checking WCAG 2.1 only:** 2.2's target-size rule is cheap to meet and
  helps touch users, so it was included.
