---
type: decision
status: accepted
date: 2026-09-21
tags: [colour]
project: cards-lite
---

# 006 — a four-colour deck from the brand, by hue capture

## Context

The user chose a four-colour deck. Roulette's ADR 011 solved the same shape of problem \u2014 give the
brand the subject's colour roles without ending the subject \u2014 and its first attempt, mapping roles
by distance from the background, "rendered a wheel in the brand's colours, and not a roulette".

## Decision

Reuse `roles()` (`roulette.js:180-219`) with `ROLE.length` 3 \u2192 4 and nothing else changed:
`[[28,40], [265,50], [145,40], [85,25]]` for heart / diamond / club / gilt. The capture, the
candidate pairs, the deterministic tiebreak sort and the "each colour once, each role once"
settlement are inherited whole, including the fix that a naive role-by-role loop was an external
review finding.

**Three roles are always derived and never a brand colour** \u2014 `spade` (roulette's `pocketB`
formula verbatim), `stock` (paper, both themes) and `ink`. A brand-coloured face or a
brand-coloured spade ends the four-colour read, which is the failure ADR 011 was written after.

**The back** is `derive(free[0] ?? grey ?? chrom[0])` \u2014 **list order, not capture order** \u2014 and it
may reuse a captured hue, because classic decks have red-backed and blue-backed editions matching
a suit.

The 265\u00b0 diamond centre is an **assumption to prototype**, not a measurement: M1 puts seven brands
\u00d7 both themes in front of the user and the user chooses, exactly as ADR 011 did.

## Consequences

- Measured: the default spintax triad captures all three colours (crimson H 3 \u2192 heart, blue H 256
  \u2192 diamond, gold H 88 \u2192 gilt), so **the default brand exercises the `chrom[0]` fallback for the
  back. Test that path first, not last.**
- Suit distinguishability is by construction: the windows are pairwise disjoint and each captured
  suit takes a fixed L (46/48/45), so none can collide with the spade at L 14.
- Gilt is ornament only \u2014 never a pip or an index \u2014 because gold on white is low-contrast by
  nature; the guard enforces what the role assignment already assumes.
- The invariant: *every hand reads as cards whatever the brand, and every brand colour given is
  used.*

## Addendum — 2026-09-21: M1, decided on the prototype by the user

Seven brands × both themes were rendered outside the library on pins and shown to the user, as
ADR 011's process requires. Three things came back:

**1. The 265° diamond centre is confirmed by measurement**, not accepted as an assumption. Against
three candidate centres, only 265° captures all of teal (`#0891b2`, H 218 — 47° away), royal blue
(`#1d4ed8`, H 296 — 31°), indigo (`#4338ca`, H 303 — 38°) and violet (`#7c3aed`, H 309 — 44°).
A 250° centre drops indigo and violet; 280° drops teal.

**2. Unclaimed suits are tinted toward the brand.** The prototype showed what the algorithm alone
could not: with one or two brand colours only one or two suits are captured, so the single-blue,
terracotta, green and grey decks came out with nearly identical faces and the brand reached the
back and almost nothing else. `tint(hue)` now leans an unclaimed suit's classic hue toward the
brand's key by at most **15°** along the shorter arc, and not at all for an achromatic brand,
which has no hue to lean toward. 15° cannot make two suits collide — the classic centres are 117°
apart at the closest — and it is enough that a terracotta brand tilts the whole deck warm
(hearts `#c83916`, clubs `#397910`) while a grey brand stays neutral.

**3. Gilt is L 58, not L 40.** At L 40 it landed on `#745b00` — olive, not gold. Measured, its
contrast against paper was **5.96**, so the ≥ 2.0 guard was never what made it dark: the lightness
was. L 58 lands near `#a68831`–`#c9a227` at contrast 2.2–3.2, above the floor for a role that this
ADR already restricts to ornament and never lets carry a pip or an index.

The invariant is unchanged and now has evidence behind it: every hand read as cards in all seven
brands, with suit contrasts against paper of 4.4–5.0 and the spade at 14.3.
