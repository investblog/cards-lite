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

## Addendum — 2026-09-21: the paint order is part of the placement

A heap is not dealt in sequence, so `pile` needs a z-order. The first attempt put it in `hand()`
behind `if (kind === 'pile')` — which broke this ADR's one rule, because painting then knew which
layout it was drawing, and a Fisher–Yates over the whole hand was not prefix-stable either: a
seventh card re-shuffled the six already placed. Both were caught by an external review (Codex).

**A placement is `(cx, cy, a)` and may carry a fourth element: its paint order.** Painting sorts
by it and falls back to the index when it is absent, so it still never learns the layout's name,
and the value is a pure function of the card's own index, so adding a card slots it into the order
without moving the others. Framing ignores the fourth element entirely.
