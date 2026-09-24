# Changelog

From here on, any change to the output bytes for the same (seed, options) is a minor version with
a line here saying what changed (roulette-lite's ADR 010, adopted by ADR 001 — this repo's own
ADR 010 is the different rule that presets are data).

## 0.1.0 — unreleased

First release.

- `Cards.hand(opts)` — a spread of playing cards as an SVG string, in Node at build time or in
  the browser. Six layouts — `fan`, `row`, `cascade`, `stack`, `pile`, `pair` — plus `auto`, each
  compiled to a list of `(cx, cy, a)` placements that framing and painting never look behind
  (ADR 007). `count` appends rather than re-deals.
- `Cards.card(opts)` — one card in a 5:7 box, centre origin, the lower half a rotated `<use>` of
  the upper. `Cards.deck(opts)` — all 52 faces as one sheet, its own output class.
- A four-colour deck: hearts, diamonds and clubs take the brand's hues by capture, spades stay
  black, and the stock stays paper in both themes — the capture is ADR 006, and a brand-coloured
  face stops reading as a card is ADR 011. Any role can be pinned with any CSS colour, `var()` included.
- Thirteen rank glyphs as stroked skeletons and four traditional suit pips, drawn once into
  `<defs>` and placed with `<use>`; the pip field is a packed table, one nibble per rank.
- Court cards carry a seeded geometric emblem — rings, spokes and a large centre pip — rather
  than a figure: a count reads at hero scale where a drawing does not (ADR 012).
- Card backs are patterned with the family's own lattices — trigon, hex and octagon, copied from
  the sibling libraries with the seam and cap fixes they earned (ADR 008) — at a seeded pitch, so
  the back contributes no seed-invariant geometry.
- Twelve named hands as data, not an evaluator: ten poker categories plus `blackjack` and
  `double-down`, each correct by construction and reproducible from its seed (ADR 010).
- The top-left index of every card stays uncovered in every overlapping spread, clamped to the
  exported `Cards.IDX`; `pile` and `stack` are exempt by design.
- Optional one-shot CSS deal, animated `from` an offset with no `to`, so
  `prefers-reduced-motion: reduce` leaves the cards in their finished places. Both halves of the
  start state — the slide and the turn — are derived from `pad`, so no card is ever clipped on
  its way in (ADR 013).
- A `line` back is paper like the face — `stock` field, `back` outline, frame and lattice in
  `back` — so a face-down card hides what lies under it; and `face: false` unpaints the court
  panel as well as the face and the back's field (ADR 011 addendum). Found on the first site to
  ship the library, before release.
- `Cards.palette(brand, { theme })` and `Cards.init(el, opts)` (browser).
- No signature in the output beyond the 17 fixed subject paths, which are counted and tested
  (ADR 005): every id, class and keyframe is a seeded token.
- 63 Node tests, a browser verify page of 14 checks green in Chromium, Firefox and WebKit and in
  both motion modes — every one of them seen to fail against a deliberately broken library — and
  8966 B min+gzip against a 9088 B budget (ADR 009).
