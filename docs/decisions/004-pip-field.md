---
type: decision
status: accepted
date: 2026-09-21
tags: [geometry, size]
project: cards-lite
---

# 004 — the pip field: a packed sym/solo table, the 7 as data

## Context

Every standard pip layout is 180\u00b0-symmetric except the 7, and three slot families map onto
themselves under rotation. A naive "draw the top half and mirror it" double-draws the centre pip
and the mid pair, and invents a pip on the 7.

## Decision

Two 4-bit fields per rank. `sym` slots are drawn inside the mirrored group and therefore appear
twice; `solo` slots are drawn once, upright, outside it. The 7's odd upper-centre pip is the `T1`
bit \u2014 **one bit of data, not a branch in the code**. Ten bytes plus a six-number coordinate table.

Each suit path is emitted once per picture into `<defs>` and placed with `<use x y>`.

## Consequences

- One `<use transform="rotate(180)">` replaces a duplicated half: ~30 B of output against 600\u2013900.
- Pips are never rotated individually; the half is \u2014 which is what real decks do.
- The packed table is kept only if `npm run size` shows it; the comparable table in roulette
  measured 67 B.
