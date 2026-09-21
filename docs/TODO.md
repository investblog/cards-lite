---
type: note
status: active
tags: [backlog]
project: cards-lite
---

# Backlog

The single list of open work: the v0.1 milestones, and what is outside them or was decided along
the way.

## v0.1

- [x] M0 — bootstrap, spec, ADRs 001–012, the engine port, `card()` blank, `palette()`, 9 tests,
  provisional budget 7680 B, measured 3108 B (2026-09-21)
- [ ] M1 — the role table prototyped **outside** the library on pins: seven brands × both themes,
  shown to the user, who chooses before `roles()` is finalised. The 265° diamond centre is decided
  here (ADR 006).
- [ ] M2 — the face: index block, the 13 rank skeletons, the pip field and its mirror; `row` and
  `fan`; the framing pass. Visual gates: 10♦ gutter, a 52-card sheet at three sizes, weight
  0.6/1/1.7/2.5 on 6-8-9-0.
- [ ] M3 — all six spreads + `auto`, both styles, the court emblem, the three-lattice back,
  `deck()`, the caps and the aspect table.
- [ ] M4 — presets, motion, `init()`, types, the determinism and 17-path tests, **budget frozen**.
- [ ] M5 — `verify.html` in three engines, CI and release workflows, README/CHANGELOG/RELEASING,
  external Codex review.
- [ ] M6 — first integration in a static site, then release 0.1.0.

## Re-ported when needed

Kept out of M0 on purpose — the family rule is that nothing speculative is carried, and lint
enforces it:

- `tokens()` (roulette.js:269-282) — seeded ids, needed once `<defs>` or a `<pattern>` appears (M2/M3).
- `DEG` — needed by the spread engine's trigonometry (M2).
- `INSET` — needed by the live-area layout (M2).

## Later (not v0.1)

- `mark()` — a suit rosette or two crossed cards at 16–64 px. roulette added its emblem at M5 and
  paid a budget raise; this one gets its own ADR when it is asked for.
- A flip and a riffle: a flip doubles a card's markup, a riffle's keyframe count scales with the
  card count. The deal is the only motion in v0.1 (ADR 006 inherited).
- `deck: 'two'` — the two-colour convention (diamonds alias hearts, clubs alias spades), ~20 B.
  Reserved, not proposed.
- `polymorph` — the family's answer to the shared element skeleton, and the long answer to the
  17-path exception (ADR 005).
