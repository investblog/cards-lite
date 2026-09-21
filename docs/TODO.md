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
- [x] M1 — the role table prototyped outside the library and decided by the user (2026-09-21):
  265° confirmed by measurement, unclaimed suits tinted ±15° toward the brand, gilt raised from
  L 40 to L 58. Recorded as an ADR 006 addendum; 11 tests.
- [x] M2 — the face and the first two spreads (2026-09-21): index block, 13 rank skeletons, the
  packed pip field and its mirror, `fan`, `row`, the framing pass, `hand()`. Visual gates passed
  in Chromium: the 52-card sheet at 108/64/40 px, the 10♦ gutter, the weight ladder. 21 tests,
  5586 B. `tokens()` and `DEG` re-ported; `INSET` still unused and still on this list.
- [x] M3 — all six spreads + `auto`, both styles, the court emblem, the three-lattice back,
  `deck()`, `facedown`, `jitter` (2026-09-21). 34 tests, 7528 B. Reviewed by Codex in two rounds:
  eleven findings, eight of them real code defects, all fixed.
- [x] M4 — the twelve named hands, the CSS deal, `init()`, the types, and the **budget frozen at
  9088 B** (measured 8747, 2026-09-21). 49 tests, including 2000 hands checked by an evaluator the
  test file carries itself — the library has none and must not grow one (ADR 010).
- [x] M5 — the browser gate, the playground, CI and release workflows, README/CHANGELOG/RELEASING
  (2026-09-21). `test/verify.html`: **13 checks ALL GREEN in Chromium 153, Firefox and WebKit,
  in both motion modes**, run from a local server, cache-busted. 60 Node tests, 8950 B.
  Reviewed in two independent passes — the Codex gate was out of quota until 2026-09-25, so the
  house `code-review` protocol ran instead. Twenty findings, all verified by measurement before
  acting: **three were defects in the library** (a spread name from outside could throw or draw a
  degenerate picture; `card({facedown:'none'})` drew the back; and the deal started 111–128 units
  outside the viewBox — ADR 013), two were false promises in this spec (five options that were
  never implemented; `motion`/`speed`/`fit`/`pad` claimed as shared), and two were checks that
  could not fail. The rest were documentation drift, corrected against measurement.
- [x] M5.1 — the two checks the review left standing, and the acceptance criterion nobody had
  tested (2026-09-21). The contrast check moved to `npm test` and grew from one brand to 28 × two
  themes × five roles, worst 4.39:1 against a floor of 3. Reduced motion is now **run**, not
  reasoned: `reducedMotion: 'reduce'` in all three engines — and the first version of that check
  passed with the `@media` gate cut out of the library, because a finished `backwards` animation
  is no longer returned by `getAnimations()`; it samples a fresh deal now, and was seen to fail.
  The index-occlusion criterion ("unoccluded in every spread but `pile` and `stack`") was tested
  only for `cascade`, and by a proxy on `dx`: it now carries the index's five points into every
  later card's own space — `fan`, `row`, `cascade`, `pair` clear over 60 seeds × three counts,
  and `pile`/`stack` are asserted to cover, so the exemption stays a measured fact.
- [ ] `split` — two hands side by side. Every layout places one group, so it waits for a two-group
  layout rather than being faked with four cards in a row (spec: Hands).
- [ ] M6 — first integration in a static site, then release 0.1.0.

## Re-ported when needed

Kept out on purpose — the family rule is that nothing speculative is carried, and lint enforces it:

- `INSET` — never needed after all: the face's numbers are absolute (ADR 003) and the back's frame
  inset is seeded. Dropped rather than carried.

## Later (not v0.1)

- `mark()` — a suit rosette or two crossed cards at 16–64 px. roulette added its emblem at M5 and
  paid a budget raise; this one gets its own ADR when it is asked for.
- A flip and a riffle: a flip doubles a card's markup, a riffle's keyframe count scales with the
  card count. The deal is the only motion in v0.1 (ADR 006 inherited).
- `deck: 'two'` — the two-colour convention (diamonds alias hearts, clubs alias spades), ~20 B.
  Reserved, not proposed.
- **Start the deal on entry** — an IntersectionObserver in `init()`, so a hand below the fold
  deals when it is reached rather than before. ~150 B against 183 B of headroom, so it is a
  budget conversation, not a free addition.
- `polymorph` — the family's answer to the shared element skeleton, and the long answer to the
  17-path exception (ADR 005).
- **The deck body** — handing a long `stack` off to an oblique extrusion of ~10 shapes instead of
  52 full cards, the way roulette draws its rim. Today an explicit list of twenty named cards is
  twenty full cards and weighs like it; the spec says so rather than pretending otherwise.
  Its four knobs — `top`, `cut`, `stripes`, `dir` — were listed in the spec's option table from
  M0 until M5, where they were struck: they described this body, not the 13 × 4 sheet `deck()`
  became when the user chose it, and no line of them was ever written. `hand()`'s `gap` went the
  same way — `step` and `reveal` already say what it would have said. A doc that promises an
  option the code does not read is the same fault as a status line claiming a release, pointed
  at the API instead (spec: Status).
