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
