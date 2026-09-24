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
  in both motion modes**, run from a local server, cache-busted. 62 Node tests, 8950 B.
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
  Reviewed in turn, and the runner had the very defect it exists to catch: `restore()` ran in an
  unconditional `finally` as `git checkout -- cards.js`, so a plain run would have discarded
  whatever was uncommitted in the file. It snapshots the bytes now and never touches git.
  The plan's palette-parity fixture landed too: `Cards.palette(b).stroke`, `.background` and
  `.halo` are byte-identical to `Hexagons.palette(b)` in all 16 brand × theme cases, pinned in
  `test/fixtures/palette-parity.json` from hexagons @ 9f9b933 so the test needs no sibling repo.
- [ ] `split` — two hands side by side. Every layout places one group, so it waits for a two-group
  layout rather than being faked with four cards in a row (spec: Hands).
- [ ] M6 — first integration in a static site, then release 0.1.0.
  - [x] the public repository, 2026-09-21: `investblog/cards-lite`, dressed like the siblings
    (public, default `main`, one-line description with the measured size, homepage and Pages from
    the root of `main`, topics from `package.json` keywords — which the two newest siblings are
    missing). CI green on the first push; Pages answer 200 and the playground draws.
  - [~] the integration — **started 2026-09-24**: photoalbummax.lol (301's test-landing family)
    ships hands in its hero, two SVGs per hero, the narrow one (`width <= 64rem`) generated with
    `face: false` and remapped to pale `var()` tints. Looking at it found two defects no gate had
    — a see-through `line` back and a court panel left filled under `face: false` — fixed in
    `cd58e2e` (ADR 011 addendum). The site's source is not in `C:\projects` under any name a
    grep found; its hand options were read off the live DOM.
  - [ ] the release — `RELEASING.md`, and **`npm version minor` before the
    bootstrap publish**, or 0.0.0 goes to the registry for good.
- [ ] **`actions/checkout@v4` and `actions/setup-node@v4` are on deprecated Node 20** — GitHub
  forces them onto Node 24 for now and annotates every run. v5 is the fix, and it is the whole
  family's problem, not this repo's alone: the same pin sits in all five. Worth doing as one
  pass, the way ADR 001 made this repo the eslint-10 pilot.

## Not verified — read this before trusting the green

Everything below is true of the gates and false of the world; nobody has used this library yet.

- **One real page, one look.** photoalbummax.lol is the first (2026-09-24), and it runs a copy
  of the library from before `cd58e2e` — whether it has picked up the fix, and whether its
  narrow variant drops `face: false` as advised, is the site owner's to check. Otherwise "works"
  means "passes 63 Node tests and 14 browser checks", nothing more.
- **`index.html` is covered by no gate at all.** `scripts/browser-gate.mjs` opens only
  `test/verify.html`, so every playground fix this session made was verified by hand in Chromium
  and by reading. Three of them were real defects (the presets gallery showed twelve identical
  cascades), which is the argument for a gate rather than against one.
- **The mutation pass runs in Chromium**, except the two reduced-motion mutations, which run in all
  three. So a Firefox- or WebKit-only regression in the other eleven checks would not be caught by
  `--mutate`, only by the plain three-engine run.
- **Nothing is published.** The package name is free, the version is deliberately `0.0.0`, and the
  npm badge in `README.md` will 404 until the first publish. That is expected, not broken.
- **The occlusion test proves something weaker than the criterion says** — five points of a
  64-wide em, where the contract reserves a 140-wide strip. Enough to pin a regression, not enough
  to be the criterion. Said so in the test itself.

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
  deals when it is reached rather than before. **The headroom it was costed against is gone:**
  183 B was measured at M4 against 8747; M5 and M5.1 spent it on the three engine fixes and now
  the library is 8950, leaving **138 B** — and 8966 / **122 B** after the paper-back fix
  (2026-09-24). At ~150 B this no longer fits at all — it is a budget *raise* conversation now,
  not a budget conversation (re-measured 2026-09-21).
- **A `flat` back under `face: false` is nearly invisible on a light page** — no field, and the
  frame and lattice stay `stock`, paper on paper. The `line` back took `back` for both on
  2026-09-24 (ADR 011 addendum); `flat` was left byte-identical on purpose. Decide when a site
  actually ships face-down cards in the airy treatment.
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
