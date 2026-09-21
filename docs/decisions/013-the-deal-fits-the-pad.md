---
type: decision
status: accepted
date: 2026-09-21
tags: [motion, geometry]
project: cards-lite
---

# 013 — the deal's whole start state is derived from the pad

## Context

`frame()` sizes the viewBox from the cards at rest and never sees the animation, so anything the
deal does before the cards arrive has to fit in the slack the framing already left: `pad`, which
is `0.06·W` = 30 units by default.

At M4 the slide was tied to `pad` and a note in `deal()` then claimed the invariant held "by
construction". It did not. The **turn** was tied to nothing — a seeded 12–28° — and CSS turns an
SVG element about the **view box** centre unless told otherwise, so the swing grew with the card's
distance from the middle of the picture. Measured at M5 in Chromium, Firefox and WebKit: card 0 of
every spread started **111–128 units outside the box**, and at `size: 900` the leading card was
65 px clipped at t = 0, still visible at 0.63 opacity 100 ms in. The Node test passed throughout
because it checked the translate and nothing else; the browser check passed because it measured an
element in `<defs>` in the wrong units (both are fixed, and both now fail on the old numbers).

This is the house lesson twice over: *do not justify an omission with an unverified mechanism* —
the note read as deliberate for a whole milestone — and *measure the claim, do not reason about
it*.

## Decision

**Every term of the start state is derived from `pad`, and the pivot is the card.**

- `transform-box: fill-box` on each animated group, so the turn pivots on the card's own centre
  and its reach stops depending on where the card sits in the picture.
- The slide takes **a quarter** of the pad; the turn is the angle that fits **three fifths** of it:
  `asin(0.6·pad / (√(W²+H²)/2))` — the half-**diagonal**, not `H/2`, because the card is already
  turned by its placement angle and turning it further from there grows the box fastest when the
  diagonal is what swings (430 units against 350 lying flat; taking the flat figure left `stack`
  6 units out).
- The remaining 15% is the viewBox's rounding: the box is written in whole units, so a picture
  whose pad says 30 really has ~29. Spending the pad exactly left 3 units hanging out.

At the default pad this is a 1.4–2.4° turn and a 7.5-unit slide.

## Consequences

- **The flourish is small, and that is the price of a tight frame.** A visible spin needs tens of
  units of room; the frame has 30. The alternative — letting `frame()` know about `motion` and
  grow — is rejected for v0.1 because it would change the static picture's viewBox when motion is
  switched on, which the family's rule and a test both forbid.
- Flying in from the deck position, which this spec's Motion section described before M5, is
  backlogged for the same reason: for `pair` and `stack` the frame is one card plus the pad, so a
  card at the picture's centre with any real turn overflows anyway. It needs a motion-aware frame.
- `transform-box` is a property in the `<style>` block, not a `transform` attribute, so the rule
  that an animated element carries no transform of its own still holds.
- Both gates now measure the whole start state: `motion.test.mjs` composes turn, slide and
  placement in arithmetic across six spreads × 40 seeds, and `verify.html` samples every card in
  viewBox units at five points in the run. Verified inside by 1.8 units at the worst of 1200 hands.
- Support floor: `transform-box: fill-box` is Chrome 64, Firefox 55, Safari 16.
