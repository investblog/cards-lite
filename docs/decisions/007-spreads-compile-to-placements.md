---
type: decision
status: accepted
date: 2026-09-21
tags: [architecture]
project: cards-lite
---

# 007 — a spread compiles to placements; handedness is fixed

## Context

A card face is specified, not generated, so the family's `seed` would have nothing to spin. The
variety the user asked for \u2014 cards folded, one behind another \u2014 lives in the arrangement.

## Decision

**Every spread compiles to a list of `(cx, cy, a)` triples \u2014 a card's centre and its rotation.
Framing and painting never learn which spread produced them.** Six functions (`fan`, `stack`,
`cascade`, `row`, `pile`, `pair`) each return that array; adding a seventh touches one table.

**Handedness is fixed, not seeded.** Real cards carry indices at top-left and bottom-right only,
so z-order is dependent, not free: fans open upward with the rightmost card on top, cascades run
down-right, rows overlap left-to-right. The mirrored configurations are the same pictures rotated,
reachable through `lean: 180`.

Framing uses the rectangle support function \u2014 `ex = w|cos a| + h|sin a|` \u2014 computed from the
**emitted, already-rounded** numbers.

## Consequences

- One class of bug disappears ("why is my index hidden"), and the alternative \u2014 four indices per
  card, forever \u2014 is not paid.
- `pile` and `stack` are explicitly exempt: a heap hides indices by nature, and that is the motif.
- The box is tight to ~11 units at a 45\u00b0 card, so "every corner is inside the viewBox" is exactly
  true rather than true-to-a-rounding, and a browser test can assert it.
- Per-card wobble uses an indexed stream key, so `count` appends rather than re-deals \u2014 pinned on
  relative placements, which is the honest form.
