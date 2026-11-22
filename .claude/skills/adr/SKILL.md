---
name: adr
description: Record an Architecture Decision Record in docs/adr/. Use when the user says /adr, asks to record or document a decision, or right after a significant decision is made (a library, pattern, data, scope, or budget choice, or reversing an earlier ADR). Also use to supersede an existing ADR.
---

# Record an ADR

ADRs live in `docs/adr/`, one decision per file, indexed in `docs/adr/README.md`.
Record a decision **when it is made**, not retroactively at the end of a milestone.

## Steps

1. **Pick the number.** List `docs/adr/` and take the highest `NNNN-` prefix + 1,
   zero-padded to 4 digits. File name: `NNNN-short-kebab-title.md`.
2. **Gather the facts from this conversation** — don't invent them:
   - What forced the decision (requirement IDs like FR-x/NFR-x, a bug, a measurement).
   - Who decided: `User`, `Claude`, or `Both` (Claude proposed, user explicitly
     accepted). If the user overruled a recommendation, say so in the Deciders line
     and list the recommendation under Alternatives.
   - Numbers that drove it (timings, sizes), so it can be re-checked later.
   - If anything is unclear (especially who decided), ask in one short question.
3. **Write the file** using the template below. Keep it short: a reader should get
   the decision in under a minute.
4. **Superseding:** if this replaces an earlier ADR, in the _old_ file change only the
   Status line to `Superseded by [ADR-NNNN](NNNN-....md).` (never rewrite its body),
   and in the new one set Status to `Accepted. Supersedes [ADR-MMMM](MMMM-....md).`
5. **Update the index** in `docs/adr/README.md`: add a row (and update the old row's
   Status when superseding). Status values: `Accepted`, `Accepted (revisit)`,
   `Proposed`, `Superseded by [NNNN](...)`, `Deprecated`.
6. **Cross-link** if relevant: `docs/ARCHITECTURE.md` (the section the decision
   affects) and `docs/REQUIREMENTS.md` (if a requirement changed).
7. **Verify links:** every relative `.md` link in the new/changed files must resolve.
8. Don't commit unless the user asks; mention the new ADR in your reply.

## Template

```markdown
# ADR-NNNN: <Decision as a short statement>

- **Status:** Accepted
- **Date:** YYYY-MM-DD (the day the decision was made)
- **Deciders:** <User | Claude | Both>. <One line on how: e.g. "Claude proposed; the user chose X over Y.">

## Context

<The forces: requirement, problem, measurement. Link related ADRs.>

## Decision

<What was decided, concretely. Bullets or a small table.>

## Consequences

<What becomes easier/harder; follow-ups; when to revisit.>

## Alternatives considered

- **<Option>:** <why not>.
```

## Style

- Plain language, present tense for the decision, past tense for what happened.
- Code identifiers in backticks; link files and other ADRs with relative paths.
- Superseded ADRs stay in the log — history explains why the current design exists.
- Process choices (branching, commit style) are not ADRs.
