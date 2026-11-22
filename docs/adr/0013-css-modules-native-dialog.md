# ADR-0013: CSS Modules and native `<dialog>`, no UI library

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. The user chose no UI component library to start with.
  Claude chose CSS Modules and the native `<dialog>`.

## Context

The app needs dialogs, form fields, a filter, cards, and a responsive grid,
with dark mode and accessibility (NFR-2, NFR-3).

## Decision

- **Styling:** CSS Modules, with design tokens as CSS custom properties in
  `ui/global.css`. Dark mode follows `prefers-color-scheme`. There is no
  styling or component library.
- **Dialogs** use the **native `<dialog>`** with `showModal()`. The browser
  provides focus trapping, Escape to close, and returning focus to the button
  that opened it.
  - React's `autoFocus` runs before the dialog is open, so it does nothing
    here. The element marked `data-autofocus` is focused right after
    `showModal()` instead.
  - jsdom has no `showModal`, so the test setup includes a small stand-in.
    Real dialog behavior is covered by the e2e tests.
- **Simple controls** are native wherever possible: checkboxes, `<select>` in
  forms, and buttons.

## Consequences

- A small bundle, and the browser handles most of the accessibility.
- Every component is styled by hand, which is more work per component than
  with a library.
- `noUncheckedIndexedAccess` types CSS-module lookups as
  `string | undefined`, so the `cx()` helper joins class names.

## Alternatives considered

- **A component library** such as Radix or MUI: faster to build with, but a
  bigger bundle, and not wanted for v1. The user can revisit this.
- **Tailwind:** fine, but not needed for this app's size.
- **A custom modal built from `div`s:** focus trapping would have to be
  written by hand. Rejected.
