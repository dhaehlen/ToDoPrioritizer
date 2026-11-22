# ADR-0003: v1 product scope

- **Status:** Accepted
- **Date:** 2026-11-20
- **Deciders:** Both. Claude proposed defaults for the open questions, and the
  user confirmed or changed each one.

## Context

The brief left several behaviors open. They were listed as Q3–Q9 in
`docs/REQUIREMENTS.md` §7 and settled before any code was written.

## Decision

| Question                                            | Decision                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Can a completed todo be marked not done again? (Q3) | **Yes.** `completedAt` is cleared.                                 |
| Do completed todos appear in the Matrix? (Q4)       | **Not by default.** A "Show completed" toggle shows them.          |
| May a todo have no quadrant? (Q5)                   | **Yes.** New todos go to **Unsorted** unless a quadrant is picked. |
| Can todos be reordered within a quadrant? (Q6)      | **Not in v1.**                                                     |
| How is deletion confirmed? (Q7)                     | **A confirmation dialog.** There is no undo.                       |
| Is there a "Delete all in Q4" action? (Q8)          | **Not in v1.**                                                     |
| Due dates, tags, or a "delegated to" field? (Q9)    | **Not in v1.**                                                     |
| Default List filter                                 | **Active.**                                                        |

Putting a todo in Q4 ("Delete") only labels it. It never deletes it.

## Consequences

- The data model stays small: title, description, quadrant, and the
  completion fields.
- Unsorted needs its own drop target in the Matrix.
- Completing a todo hides it from the default views but never loses it. That
  is why the List has a Completed filter.
- Anything left out is listed under "Out of scope for v1" in the requirements,
  so it isn't forgotten.

## Alternatives considered

- **Undo instead of a confirmation dialog:** friendlier, but it needs a timed
  toast and a way to restore the todo. Deferred.
- **Requiring a quadrant for every todo:** makes quick capture harder. Rejected.
