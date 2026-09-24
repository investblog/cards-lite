---
type: decision
status: accepted
date: 2026-09-21
tags: [styles]
project: cards-lite
---

# 011 — `style` governs pips, court and back — not the face

## Context

In the family, `line` means nothing is filled. Applied literally to a card, that means a
transparent face: a pip cluster floating on the page.

## Decision

`style: 'line' | 'flat'` governs the pips, the court panel and the back. **The face is always
painted in `stock`**, which also makes it theme-invariant. `face: false` is the escape hatch for
the literal reading.

Two exceptions inside the styles, each with its reason: the **corner mini-pip is always filled**
(at ~6 px in a fan an outlined pip fills in and vanishes), and the **rank index is always a
stroked skeleton** (there is no filled variant, and that is what makes it 234 B instead of 1003).

## Consequences

- cards-lite's `line` means less than roulette's `line` does. The spec says so in one sentence
  rather than letting someone discover it.
- The suit contrast guards run against `stock`, not against `background` \u2014 one guard path, not
  two, and `roles()` never has to learn the style.
- The family's "large flat colour fights a white page" lesson now applies to the **back** alone:
  under `theme: 'light'` the back defaults to `line`, the `table()` precedent verbatim.
- A dark theme does not darken the face. That is correct for the subject and surprising to someone
  expecting otherwise, so it belongs in the options table, not only here.

## Addendum — 2026-09-24: the back and the panel follow the face

Two leaks of the same decision, both seen on the first site to ship the library:

- **A `line` back was unfilled.** A face-down card in a `line` fan showed the card beneath it —
  the transparent card this ADR refuses for the face. Its frame and lattice were drawn in `stock`,
  so on a light page they were paper-on-paper and nearly invisible. Now the field is `stock` with a
  `back` outline, and the frame and lattice take `back`. `flat` is unchanged.
- **`face: false` left the court panel filled.** Under `flat` the panel is `stock`, so an airy
  hand carried opaque blocks on see-through cards. `face: false` now unpaints every `stock`
  surface: face, back field and panel.

Both change the bytes of the affected outputs; 0.1.0 is unreleased, so no version is spent.
