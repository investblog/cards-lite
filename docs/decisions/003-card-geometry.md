---
type: decision
status: accepted
date: 2026-09-21
tags: [geometry]
project: cards-lite
---

# 003 — card geometry: 5:7 at 500×700, centre origin, the 180° mirror

## Context

A poker card is 63 \u00d7 88 mm \u2014 0.716. The drawing needs a coordinate scale that keeps every
authored number an integer, and a card is 180\u00b0-rotationally symmetric in a way the drawing can
exploit rather than re-emit.

## Decision

`viewBox="-250 -350 500 700"` \u2014 5:7 = 0.714, both numbers round. Origin at the **card centre**,
y down. Corner radius 24\u201336 (seeded), live area inset 30, index em 64 \u00d7 96 centred
(\u2212184, \u2212258), pip columns x \u2208 {\u2212100, 0, 100}, rows y \u2208 {\u00b1206, \u00b1103, \u00b169, 0}, court panel
260 \u00d7 472.

The centre origin is structural: **the lower half of every card is `<use transform="rotate(180)">`
of the upper half**, so inverted pips and the bottom-right index come from one attribute.

`IDX = 140` \u2014 the index reach \u2014 is a single exported constant, never a number typed into six
layout functions.

## Consequences

- Every overlapping spread clamps its exposure to \u2265 `IDX`; a seeded value is clamped, an explicit
  option is honoured verbatim.
- The tightest gutter on the card is the 10's 8 units. The lever, if a visual pass rejects it, is
  the 10's condensed width \u2014 never the pip columns, which would break the layout table.
- If the index block's numbers ever move, `IDX` and every overlap floor move with them.
