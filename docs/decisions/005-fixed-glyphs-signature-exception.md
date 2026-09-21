---
type: decision
status: accepted
date: 2026-09-21
tags: [output, size]
project: cards-lite
---

# 005 — rank and suit glyphs as fixed stroked skeletons: the no-signature exception

## Context

The family's no-signature rule (roulette-lite ADR 005) forbids output that names or fingerprints
the tool, and its addendum states the sharp form: *what makes an output this library's is a fixed
value, not a fixed attribute name.* A deck needs rank indices \u2014 and in a fan or a stack the corner
index is the only thing that identifies a card. Drawn as paths, those are fixed `d` values present
in every render on every site.

## Decision

**Carry the exception, and write it narrowly: exactly 17 fixed `d` values** \u2014 13 rank skeletons
and 4 suit pips. Not 13: the pips are equally fixed, the corner mini-pip reuses them, and a seeded
heart is a worse heart.

The argument, in order:

1. **ADR 005 guards tool-identity, not subject-identity.** Its own test forbids comments,
   metadata, `data-*`, `xlink`, library and credit names, ids and colour literals \u2014 never subject
   geometry.
2. **The parent already ships fixed subject geometry, unremarked:** `roulette.js:566` emits
   `M32 18V46M18 32H46` on every `mark()` with arms, `:569` the diamond hub, and `table()` emits a
   fixed 1400\u00d7500 grid on every render. This ADR names a door that is already open.
3. **Seeded letterforms were measured and rejected on a stronger ground than cost.** Fixed
   skeletons: 234 B (a second sample, 296 B). A parametric topology-plus-generator sketch: 431 B as
   a *lower bound*, 600\u2013800 B shipped. And it would not work: a seeded skeleton keeps its topology
   \u2014 subpath count, command sequence, point order \u2014 so a detector keys on structure and the
   fingerprint moves from the literal into the grammar. Varying the grammar is `polymorph`, which
   the family already names as the answer to that limit.
4. **The index is load-bearing.** At fan-corner size the glyph is ~8\u201314 px; variance in the
   aperture of 6, 8, 9 and 0 is exactly where legibility breaks. A library whose de-signing makes
   its own subject unreadable has traded the wrong thing.
5. **The scope is principled, and the back proves it.** The card back carries no fixed `d` at all
   \u2014 its lattice is rebuilt from a seeded pitch, so every number in it changes with the seed. The
   17 fixed paths are confined to where a fixed shape *is* the point.

**The honest counter, on the record:** a 12\u00d73 betting grid is canonical \u2014 anyone drawing that
layout lands on those coordinates. A letterform is a design choice, so 17 constant strings
fingerprint this tool materially more than roulette's grid does. This exception genuinely widens
the surface ADR 005 protects, and it is accepted with that cost stated rather than denied.

**Opt-outs ship with it:** `index: false` removes the 13, `pips: false` removes the 4, a back-only
card emits neither.

## Consequences

- A test intersects the `d` values over seeds 1\u2013100: the seed-invariant set must be **exactly**
  those 17, and **the court emblem and the back must contribute zero** \u2014 that is the proof the
  rest is genuinely seeded rather than merely counted.
- `index: false` must be documented next to the option as unsuitable in a spread, or sites will
  reach for it as a privacy setting and silently lose the subject.
- Recommended to the parent, not done here: an addendum to roulette-lite's ADR 005 recording the
  `mark()`/`table()` subject-geometry precedent this ADR cites.
