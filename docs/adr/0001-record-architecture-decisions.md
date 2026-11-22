# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** User

## Context

ToDoPrioritizer was built in milestones M0–M7 by the project owner working
with an AI pair programmer. Many decisions were made in conversation, where
they are easy to lose. Some were the user's calls, such as the stack and the
performance budgets. Others were made by the AI during implementation, such as
the optimistic UI and the rendering fixes. `docs/REQUIREMENTS.md` and
`docs/ARCHITECTURE.md` describe _what_ the system is, but not always _why_ or
_who chose it_.

## Decision

Record significant decisions as Architecture Decision Records in `docs/adr/`,
one file per decision, numbered in order. The ADRs written after the fact
(0002–0022) are dated to when each decision was actually made.

Each ADR has: Status, Date, Deciders, Context, Decision, Consequences, and
Alternatives considered. A changed decision gets a new ADR that supersedes the
old one. The old one is kept.

## Consequences

- Future contributors, human or AI, can see why things are the way they are
  before changing them.
- There's some upkeep: a significant new decision means writing a short ADR.
- `docs/ARCHITECTURE.md` stays the place for "how it works now". ADRs are the
  history.
