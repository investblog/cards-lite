---
type: decision
status: accepted
date: 2026-09-21
tags: [geometry, size]
project: cards-lite
---

# 008 — the card back from the family's own lattices

## Context

The back is where the seed does its richest work. The user's suggestion: take the pattern from the
other siblings, which already have backgrounds. They do \u2014 and better than expected: their
`pattern()` functions already emit SVG, not canvas (`trigons-lite.js:427`, `hexagons.js:870`,
`octagons.js:463`), returning a raw SVG string under `opts.raw`.

## Decision

Copy the three `d` builders **verbatim, with their seam and cap comments** \u2014 segments drawn on
both opposite tile edges so neighbouring tiles sum to full weight, and butt caps because round
caps blunt vertices and turn small octagons into circles. Both comments were earned by defects;
re-deriving would re-earn them. Drop the `<svg>` wrapper and the data-URI return.

Tile them through an SVG `<pattern>` with a seeded id, driven by a seeded pitch, rotation, phase,
weight and opacity. **No `clipPath`: the rounded rect is the clip**, because a pattern fill is
clipped by the shape it fills.

Measured: all three lattices plus the emitter cost **633 B** gzip \u2014 the second 83 B, the third
133 B \u2014 against `mark()`'s 427 and `table()`'s 512. Carry all three.

## Consequences

- Because the pitch changes every coordinate in the tile, the back contributes **no seed-invariant
  `d`**, which is the fact ADR 005 here leans on.
- Inlining the tiles instead would need ~540 per card \u2014 tens of KB, instantly through the per-card
  ceiling.
- `detail: 1` draws field + frame + optional medallion and no lattice: at 60\u2013100 px a 1-unit
  stroke at pitch 26 is a 0.1\u20130.2 px line that shimmers rather than draws. `deck()` defaults to it.
- Both lattice kinds draw from the same roles (`stock` on `back`), or a seed-only change would
  alter the set of colours and break the determinism test.
- A source comment names the sibling and line each builder came from. Never in the output.
