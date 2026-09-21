---
type: decision
status: accepted
date: 2026-09-21
tags: [size]
project: cards-lite
---

# 009 — size budget and how it is measured

## Context

The family measures with terser in process plus Node `gzipSync` at level 9, never the gzip CLI
whose header carries the file name. roulette-lite's budget history records two opposite failures:
a provisional *below* the forecast fails every run and trains everyone to ignore the gate, and a
round ceiling well *above* it (8192 B, ~9% headroom) stops being a tripwire at all.

## Decision

`scripts/size.mjs` reads `package.json` `config.sizeBudget`, prints the byte count and exits 1
above it. **Provisional 7680 B at M0** \u2014 the forecast's upper bound, so the gate can be believed
from the first run. **Frozen at measured + 2.5%, rounded up to the next 128 B**, after the
milestone that lands the face, the back and motion.

Forecast by part (gzip): colour core 1.47 KB \u00b7 markup/seeds/streams/tokens 0.75 \u00b7 face
scaffolding 1.10 \u00b7 the 17 glyph paths 0.30 (measured) \u00b7 glyph plumbing 0.15 \u00b7 court emblem 0.45 \u00b7
back with three lattices 0.63 (measured) \u00b7 motion 0.35 \u00b7 `deck()` 0.25 \u00b7 presets 0.15 \u00b7 `init()`
0.45 \u00b7 spreads and framing 0.90 \u2192 **~6.95 KB**.

## Consequences

- The freeze is deliberately tight, and explicitly not the round-ceiling style whose looseness is
  on roulette's own record as a cost.
- Every trim is kept only if `npm run size` shows it.
- History line to maintain here as addenda: *provisional 7680 (M0) \u2192 frozen at measured + 2.5%.*

## Addendum — 2026-09-21: frozen at 9088 B after M4

Measured with the hands, the deal, `init()` and the types in: **8747 B**. Frozen at **9088 B** —
measured + 2.5% rounded up to the next 128, which is what the decision above prescribes. The
user's call, on the record.

**The M0 forecast was 26% low** (~6.95 KB against 8747 B), and it is worth saying where, because
the next sibling will forecast the same way:

| Part | Forecast | Actual |
|---|---|---|
| hand presets | 0.15 KB | **0.60 KB** |
| the back, three lattices | 0.63 KB | 0.63 KB (measured before it was written) |
| motion + `init()` | 0.80 KB | 0.47 KB |
| the rest — face, spreads, colour | ~5.4 KB | ~7.0 KB |

The two parts that were *measured* before being written came in exactly; the parts that were
*estimated* came in high. That is the lesson, and it is the same one the family already carries in
another form: measure the claim, do not reason about it.

**What a trim would actually buy, measured rather than assumed:** `init()` 157 B, `deck()` 139 B,
the octagon lattice 62 B — 358 B together, or 4%. Dropping three real features to recover 4% is a
bad trade and was declined; the gap to the old provisional was 1067 B, so trimming could not have
saved it in any case.

History: provisional 7680 (M0) → **frozen 9088 (M4)**. From here the rule is the family's: this is
room for fixes, not for features. The next feature raises it again, on the record, or does not come.
