---
type: decision
status: accepted
date: 2026-09-21
tags: [geometry]
project: cards-lite
---

# 012 — the court emblem: seeded geometry, rank by ring count

## Context

Court cards need a centre. A figure drawing of a king would be hundreds of bytes of authored
curves and a second fixed-shape problem on top of ADR 005's exception.

## Decision

A geometric rosette in the spirit of roulette's `mark()`, inside a 260 \u00d7 472 panel at the card
centre \u2014 which is 180\u00b0-symmetric by construction, so it needs no mirroring. **Rank is a
structural ring count, fixed and not seeded: J = 1, Q = 2, K = 3.** The suit pip sits at the
rosette's centre at 1.3\u00d7, so the suit reads from the middle of the card. Seeded from `court:*`:
segment count (6/8/10/12), spokes, ring phase, outer ring dashed or solid, corner rosettes, panel
radius.

## Consequences

- **Every seeded count must be even**, or the 180\u00b0 symmetry claim breaks.
- The emblem must contribute zero seed-invariant `d` values \u2014 ADR 005's test depends on it.
- A count reads where a figure does not at hero scale, and the corner index carries the rank
  anyway.
