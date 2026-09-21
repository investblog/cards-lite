---
type: decision
status: accepted
date: 2026-09-21
tags: [process]
project: cards-lite
---

# 001 — adopt the family ADRs

## Context

cards-lite is the fifth library in the family and the second that emits an SVG string.
Re-deriving decisions the family already paid for would waste the payment.

## Decision

Adopted by reference from roulette-lite, the direct parent: **002** (an SVG string, not a canvas),
**005** (no signature in the output \u2014 extended here by this project's own 005), **006** (motion
through CSS inside the SVG), **007** (module format: ES5 IIFE with a UMD tail), **008** (Node
tests alongside a manual verify page), **009**'s measurement method (terser in process + Node
`gzipSync`, never the gzip CLI), **010** (output stability is a contract), **011**'s capture
algorithm.

From further up the family: contract-first (the spec changes before the code), auto-palette from
`brand` in CIE LCh, the minified file is generated and never committed, `author: 301ST`, OIDC
trusted publishing after a one-time token bootstrap, and "gzip beats clever \u2014 trim only by
measurement".

**One deliberate divergence: ESLint 10.** The family pins `^9.39.4` and carries "eslint 10 across
all four libs at once (npm marks 9.x unsupported)" in roulette-lite's backlog. A greenfield repo
has no migration cost, so this one starts on 10 and is the pilot the other four follow.

## Consequences

- The divergence is recorded here so it reads as deliberate rather than as drift.
- Where this project extends an inherited decision (005, the glyph exception), it does so in its
  own numbered ADR and cites the parent rather than editing it.
