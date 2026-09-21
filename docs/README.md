---
type: note
status: active
tags: [architecture, overview, spec]
project: cards-lite
---

# cards-lite — spec / dev source of truth

Docs for developers and agents. `index.html` is the verification surface, `test/` the gate.
Contract-first: change the doc here **before** the code, then code.

**Status (2026-09-21): M5 — the browser gate is ALL GREEN in Chromium, Firefox and WebKit, in
both motion modes; the playground, the CI and release workflows and the public docs are in.
Nothing is published.** What
remains is M6: a first integration in a static site, then the 0.1.0 release — the repository, the
token and the publish each on the maintainer's go (`RELEASING.md`). This line is kept
true at every milestone; a spec that still says "SPEC" after shipping (hexagons) is the thing it
guards against, and one that claims a release it has not made is the same fault pointing the
other way.

## The pitch, in one paragraph

Playing cards drawn by code. One call returns an SVG string — in Node at build time or in the
browser — so a static site gets its hero art with no script on the page. Two knobs span the
variant space: **`seed`** spins the spread and the backs, **`brand`** spins the colours (one hex,
the whole deck). A hand is a fan, a stack, a cascade, a row, a heap or a two-card blackjack pair;
the ten poker hands and the blackjack motifs ship as named presets. Two styles behind one knob —
`line` art like its siblings, or `flat` fills — and an optional CSS deal that stops for readers
who asked for less motion. Zero dependencies, a few KB.

## The load-bearing idea

A card face is **specified, not generated**. The 7♥ cannot vary and stay itself, so the family's
`seed` would have nothing to do — unless it moves one level up. It does:

> **Every spread compiles to a list of `(cx, cy, a)` triples — a card's centre in layout space and
> its rotation about that centre. Framing and painting never learn which spread produced them.**

Six small functions (`fan`, `stack`, `cascade`, `row`, `pile`, `pair`) each return that array;
`frame()` turns an array of triples into a viewBox; `paint()` turns triples plus card codes into
markup. Adding a seventh layout touches one table and nothing else — the analogue of roulette's
"`view: 'top'` is the same code with θ = 0". The seed's remaining work is the **card backs** and
the **court emblems**, both genuinely procedural.

### Card space

`viewBox="-250 -350 500 700"` — exactly 5:7 (a poker card is 63 × 88 mm = 0.716; 5:7 = 0.714, and
both numbers are round). Origin at the card centre, y down.

**Centre origin is load-bearing, not cosmetic:** the whole lower half of a card is the upper half
under `rotate(180)`, so inverted pips and the bottom-right index come free from one attribute.

| Constant | Value | What |
|---|---|---|
| `W`, `H` | 500, 700 | the card |
| `w`, `h` | 250, 350 | half-extents |
| **`IDX`** | **140** | **the index reach** — the strip from the card's left edge that must stay uncovered for the rank to read |
| `INSET` | 30 | live area inside the card edge |
| `CR` | 24–36 (seeded `card:rx`) | corner radius, 4.8–7.2% of width (a real card is ≈ 5.6%) |

`IDX` is the one number that ties overlap to legibility, and it is a single exported constant, not
a number typed into six layout functions. **Every layout that overlaps clamps its exposure to
≥ `IDX`.** A seeded value is always clamped into the safe range; an explicit numeric option is
honoured verbatim — otherwise the clamp reads as "the library ignored my `reveal: 0.15`".

### Anatomy of a face

| Part | Geometry | Seeded? |
|---|---|---|
| Card rect | 500 × 700, `rx` = `CR` | radius only |
| Edge rule | inset 1.5, stroke `ink`, width `3·weight` | no |
| Index block (top-left; bottom-right is the same group rotated) | rank em 64 × 96 centred (−184, −258); `10` is 80 × 96, one `d` with two subpaths; mini pip 56 × 62 centred (−184, −172) | no |
| Index stroke | `min(12·weight, 20)` — 12.5–20.8% of cap height | weight only |
| Pip field | pip box 72 × 80; columns x ∈ {−100, 0, 100}; rows y ∈ {±206, ±103, ±69, 0} | scale only, 0.96–1.06 |
| Ace | one pip at (0,0) at scale 1.9, fixed | no |
| Court panel | 260 × 472, `rx` 16, centred; rosette rings at r = 112 / 86 / 58 / 30 | ornament |

**The tightest place on the card is the 10.** Its index spans x ∈ [−224, −144] and the left pip
column starts at −136: an **8-unit gutter**, which is what real 10s have. The lever, if a visual
pass calls it crowded, is the 10's condensed width — never the pip column, because moving the
column breaks the layout table. `10♦` is the first card to put on screen.

## Pips without a special case

Every standard layout is 180°-symmetric **except the 7**, and three slot families map onto
themselves under rotation, so a naive "draw the top half and mirror it" double-draws two of them
and invents a pip on the 7. Two 4-bit fields per rank solve both in data:

- **`sym`** — drawn inside the mirrored group, so each slot appears twice:
  `S0` pair (±100, −206) · `S1` centre (0, −206) · `S2` pair (±100, −69) · `S3` centre (0, −103)
- **`solo`** — drawn once, upright, outside the mirrored group:
  `T0` centre (0,0) · `T1` centre (0, −103) · `T2` ace scale · `T3` pair (±100, 0)

| Rank | A | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `sym` | — | S1 | S1 | S0 | S0 | S0 | S0 | S0+S3 | S0+S2 | S0+S2+S3 |
| `solo` | T0+T2 | — | T0 | — | T0 | T3 | T3+T1 | T3 | T0 | — |

**The 7's odd pip is one bit of data, not a branch in the code.** Ten bytes plus a six-number
coordinate table.

The mirror is one id and one `<use transform="rotate(180)">` — about 30 bytes of output against
600–900 of a duplicated half, and it is the single largest byte win on the face. Pips are never
rotated individually; the half is, which is what real decks do.

Each suit `d` is emitted **once per picture** into `<defs>` and placed with `<use x y>` (cheaper
than a `transform`). A 10 is ten ~30 B uses instead of ten ~120 B paths.

## The rank alphabet

Thirteen **stroked skeletons**, no fonts and no `<text>` — measured at 234 B gzip against 1003 B
for filled outlines, and a filled outline cannot take a `weight` at all.

- One em for all thirteen: 64 wide × 96 cap height, origin at the glyph centre, every control
  point on an 8-unit lattice. Integers, so `precision: 0` holds everywhere.
- **The command set is closed: `M L H V Q T`.** No arcs, no cubics — gzip sees one alphabet across
  thirteen strings, and a quadratic is the natural bowl for a lining figure.
- `10` is **one glyph**: a condensed `1` and a `0`, kerned to 80 × 96, emitted as one `d` with two
  subpaths. It is the widest rank and the index block is sized to it.
- `A J Q K` are letters on the same em with the same command set. Nothing about them needs a
  separate mechanism.
- `weight` moves the **stroke width only**; the skeleton never moves. Base 12 units, **clamped at
  20**, beyond which the counters of 6, 8, 9 and 0 close into blobs. The clamp is an assertion
  until it is seen on screen at fan-corner size — the sibling rule is that a passing lint proves
  nothing in a visual library.

## Colour — a four-colour deck from the brand

A hand is read by its suits before its ranks. The palette keeps those meanings and lets the brand
fill them, by the capture algorithm of roulette's ADR 011: chromatic brand colours (LCh chroma
≥ 12) take the role nearest their hue; every (colour, role) pair inside a role's window is a
candidate; the nearest pairs are settled first, each colour and each role at most once; ties break
by colour order then role order, so the result never depends on the engine's sort.

| Role | Target hue | Window | A captured colour keeps | Otherwise — the classic hue, **tinted**, in the brand's key |
|---|---|---|---|---|
| `heart` | 28° | ±40 | hue and chroma, L 46 | lch(46, clamp(bodyC·1.2, 50, 75), tint(28)) |
| `diamond` | 265° | ±50 | hue and chroma, L 48 | lch(48, clamp(bodyC·1.1, 45, 70), tint(265)) |
| `club` | 145° | ±40 | hue and chroma, L 45 | lch(45, clamp(bodyC, 35, 60), tint(145)) |
| `gilt` | 85° | ±25 | hue, chroma ×0.8, **L 58 always** | lch(58, 35, 85); chrome (C 0) for a grey brand |

**`tint(hue)` leans an unclaimed suit toward the brand** by at most 15° along the shorter arc,
and not at all for an achromatic brand, which has no hue to lean toward. One or two brand colours
can capture only one or two suits, so without this the brand reached the back and almost nothing
else — visible at M1, where the single-blue, terracotta, green and grey decks came out with nearly
identical faces. 15° is small enough that a red stays red (the nearest classic centres are 117°
apart, so no shift can make two suits collide) and large enough that a terracotta brand tilts the
whole deck warm.

**Gilt is L 58, not L 40** — measured at M1: L 40 lands on `#745b00`, which is olive rather than
gold, and its contrast against paper is **5.96**, so the ≥ 2.0 guard was never what made it dark.
L 58 lands near `#c9a227` at contrast 2.2 — above the floor for a role that, by this ADR, is only
ever ornament and never carries a pip or an index.

The diamond window is wider because the blue–indigo region is perceptually broad and nothing
competes there. **Confirmed at M1 by measurement**, against three candidate centres: only 265°
captures all of teal (`#0891b2`, H 218, 47° away), royal blue (`#1d4ed8`, H 296, 31°), indigo
(`#4338ca`, H 303, 38°) and violet (`#7c3aed`, H 309, 44°). A 250° centre drops indigo and violet;
280° drops teal. The window leaves a 30° gap to clubs.

**Three roles are always derived and never a brand colour** — they are the constants the subject
is read by:

- `spade` = lch(14, min(bodyC·0.15, 6), bodyH) — roulette's `pocketB` formula verbatim. A deck has
  one black suit; a brand-coloured spade ends the four-colour read.
- `stock` = lch(96.5, min(bodyC·0.08, 4), bodyH), **both themes** — a card face is paper.
- `ink` = lch(34, min(bodyC·0.25, 10), bodyH) — rules, edges, court structure; a thinner line that
  must read lighter than the spade pip beside it, as on a real card.

**The back** is `derive(free[0] ?? grey ?? chrom[0]).colors[0]`, and it **may reuse a captured
hue** — classic decks have red-backed and blue-backed editions matching a suit. That fallback is
not the rare path: measured, the default spintax triad captures all three colours (crimson H 3 →
hearts, blue H 256 → diamonds, gold H 88 → gilt), leaving nothing over, so **the default brand
exercises `chrom[0]`. Test it first, not last.** List order, not capture order, so the choice is
deliberate rather than an accident of which role settled first.

Leftovers cascade as in roulette: `free[1]` → the court panel tint; a grey brand colour is the
back when no chromatic colour is left, otherwise the gilt as silver/chrome if nobody took the
brass, else the panel tint. Every brand colour given is used as long as it has a place.

**Guards** (derived values only; a pin is the caller's responsibility): every suit ≥ 3.0 against
`stock`; `spade` ≥ 7; `ink` ≥ 3.0; `gilt` ≥ 2.0 — and **gilt is only ever ornament**, never a pip
or an index, because gold on white is low-contrast by nature. No guard on `back` against
`background`: the `stock` frame and the `ink` edge rule are what separate a card from the page,
and both are guarded. Suit distinguishability is by construction, not by a runtime check: the
three chromatic windows are pairwise disjoint and each captured suit takes a fixed L (46/48/45),
so none can collide with the spade at L 14.

**Pins win.** Any role accepts any CSS colour string — hex, `rgb()`, `var(--x, #fallback)`. The
renderer never parses a pinned value; it only escapes `" < > &`. `'auto'` unpins.

**The invariant:** *every hand reads as cards whatever the brand — a paper face, one black suit,
four distinguishable suit colours, and an index that survives a fan; and every brand colour given
is used.*

## Styles

`style: 'line' | 'flat'` governs **pips, court and back. The face is always painted in `stock`**,
which makes it theme-invariant.

This is a deliberate deviation and it is stated here rather than left to be discovered: cards-lite's
`line` means less than roulette's `line` does. A playing card is read as a light rectangle before
it is read as anything else, and a transparent card in a fan loses the overlap cue that makes a
fan a fan. `face: false` is the escape hatch for anyone who wants the airy treatment.

One path set serves both styles, switched by `table()`'s `paint()` idiom — `fill` when flat,
`stroke` when line — so `line` costs no extra path data. **Two exceptions, each with its reason:**

- **The corner mini-pip is always filled**, in both styles. At ~6 px in a fan an outlined pip
  fills in and vanishes. Same class of rule as `table()`'s "line marks the red and the zero and
  leaves the rest to the metal rule".
- **The rank index is always a stroked skeleton**, in both styles — there is no filled variant,
  and that is what makes it 234 B instead of 1003 B.

Under `theme: 'light'` the **back** defaults to `line`: filled cells over a white page stop reading
as the site's palette and start fighting it. That lesson (roulette's `table()`) now applies to the
back alone, because the face is paper in both themes.

## The card back — where the family meets

The back is the seed's richest work, and its pattern comes from the siblings' own lattices:
`trigons-lite.js:427`, `hexagons.js:870` and `octagons.js:463` already build SVG path data and
return a raw SVG string under `opts.raw`. Their geometry is carried **unchanged, and so are both
guardrail comments** — consolidated behind one shared `seg()` (ADR 008 addendum), with the cap rule
moved to the stroke, which is where caps are decided — both were earned by defects: segments are drawn on *both* opposite tile
edges so neighbouring tiles sum to full weight, and caps are **butt, not round**, because round
caps blunt vertices and turn small octagons into circles. What is dropped is the `<svg>` wrapper
and the data-URI return.

Carrying all three lattices plus the emitter measures **633 B** gzip — the second costs 83 B and
the third 133 B, so variety here is nearly free, and 633 B sits between `mark()` (+427) and
`table()` (+512) in family terms.

```
<defs><pattern id="{token}" patternUnits="userSpaceOnUse" width="P" height="P"
      patternTransform="translate(dx dy) rotate(θ)">
  <path d="{lattice}" fill="none" stroke="{stock}" stroke-width="w" stroke-opacity="α"/>
</pattern></defs>
<rect … rx="CR" fill="{back}"/>
<rect … inset b, rx="CR−0.8b" fill="url(#{token})" stroke="{stock}" stroke-width="6"/>
```

**No `clipPath` is needed — the rounded rect *is* the clip**, because a pattern fill is clipped by
the shape it fills. That is one id cheaper than roulette's aperture clip, and it is why the frame
inset is structural rather than decorative: it keeps the lattice off the card's own corner.

| Stream | Range |
|---|---|
| `back:lattice` | trigon / hex / octagon, equal thirds (option `lattice`, `'auto'` by default) |
| `back:pitch` | P = 26–56 — 9–19 cells across a card |
| `back:weight` | 1.0–2.4 units |
| `back:op` | 0.14–0.26 |
| `back:turn` · `back:phase` | rotate 0–90° · translate 0–P, via `patternTransform` |
| `back:orient` | flat / pointy (hexagon only) |
| `back:inset` | b = 20–32, the `stock` frame |
| `back:medallion` | absent, or the court rosette at 1–3 rings |

Because the pitch changes every coordinate in the tile, **the back contributes no seed-invariant
`d`** — which is the fact the no-signature argument below leans on.

The pitch range was 18–34 until M3, when looking at it settled the question: at that density all
three lattices read as one fine texture and the choice between them was invisible. 26–56 lets the
motif show. The cost is stated rather than glossed: at the coarse end a 60-unit fan strip holds
about one cell, not several, so in a tight fan the backs read as the `stock` frame plus a fragment
of pattern.

At fan width only a 60–90 unit strip of a back shows, so the **`stock` frame is the primary read**,
not the lattice — a fan of backs reads as a rhythm of white edges, which is how a real fanned deck
reads. `detail: 1` draws field + frame + optional medallion and no lattice at all, and `deck()`
and dense fans default to it: at a 60–100 px card a 1-unit stroke at pitch 26 is a 0.1–0.2 px line
that shimmers rather than draws.

## Spreads

Handedness is **fixed, not seeded**. Real cards carry indices at top-left and bottom-right only,
so z-order is a dependent variable: fans open upward with the rightmost card on top, cascades run
down-right, rows overlap left-to-right, later cards are drawn later. The mirrored configurations
are not new variety — because the index pair is 180°-rotationally symmetric, a top-pivot
right-to-left fan *is* the bottom-pivot fan rotated, reachable through `lean: 180`. This costs
nothing, removes a whole class of "why is my index hidden" bug, and is the alternative to drawing
four indices per card forever.

`pile` is exempt and says so — a heap hides indices by nature; that *is* the motif. `stack` is
exempt below its top card for the same reason.

| Spread | Seeded parameters | Typical aspect, 5 cards |
|---|---|---|
| `fan` | `arc` 1.6–2.6 × H · `reveal` 0.34–0.62 (the step is derived: `Δ = degrees(reveal·W/Rp)`, landing at 5.3–15.9°) · `lean` ±10° | 1.4 : 1 |
| `row` | `reveal` 0.32–0.62 · `rise` 0–0.05 H, sampled from a **fixed** parabola · `tilt` ±0–3° alternating | 1.9 : 1 |
| `cascade` | `dx` 0.28–0.42 W (**floor is `IDX`** — the layout where the index binds) · `dy` 0.14–0.26 H · `tilt` 0–2.5° accumulating | 0.94 : 1 |
| `stack` | `lift` 2–5 units/card · `skew` ±0.35°/card · `dir` 100–140° · `mess` 0–3 cards breaking rank | 0.75 : 1 |
| `pile` | `scatter` 0.10–0.35 W in a disc · `spin` ±18–40° · a seeded z permutation | 0.93 : 1 |
| `pair` | `angle` 10–26° · `offset` (0.38–0.52 W, −0.02…+0.06 H) · a crosswise third for double-down | 1.01 : 1 |

The aspects are **medians over 300 seeds at five cards**, not ceilings: `fan` runs 1.13–1.75,
`row` 1.52–2.34, `cascade` 0.78–1.21, `stack` 0.73–0.83, `pile` 0.74–1.10, `pair` 0.78–0.91.
A page reserving a box takes the band, not the median.

Per-card wobble comes from an **indexed** key (`spread:jitter:3`), never a loop over one stream,
so bumping `count` does not re-roll the cards already placed. For the same reason the row's rise
is sampled from a parabola anchored at a **fixed** span rather than at the hand's own midpoint: a
parabola normalised by the count moves every card when one is added, which would break the
promise below in the one layout that looks most obviously like a straight line.

**Caps apply to `count`, not to an explicit list.** fan 10, cascade 13, row 7, pile 12, stack 8.
Over a cap `count` clamps silently — the house never throws. An explicit `cards` list is never
truncated: the *spread* gives way instead (cascade up to 13, stack beyond it), and a stack of
twenty named cards is twenty full cards and weighs like it. The compact alternative — handing a
long stack off to a **deck body**, an oblique extrusion of ~10 shapes rather than 52 rounded rects
— is in the backlog, not in v0.1.

`spread: 'auto'` chooses by count and is **opt-in, not the default** (house precedent: `variant`,
`view`). The reason is concrete: `auto` swings the aspect from 0.79 : 1 to 2.29 : 1 under a seed
change at five cards, and 0.64 : 1 to 2.28 : 1 across counts — which breaks a page's reserved box. The aspect table above is published so a page author
can reserve one; name the spread if you need a fixed box.

### Framing

A fan's bounds are **not** the union of axis-aligned card rects — a card at 40° has half-extents
391 × 428 against its unrotated 250 × 350, so ignoring rotation crops the corners off every fan.
A rectangle's support function is exact and costs four multiplies per card:

```
ex = w·|cos a| + h·|sin a|        ey = w·|sin a| + h·|cos a|
box ∪= (cx ± ex, cy ± ey)
pad = (opts.pad ?? 0.06)·W
```

The corner radius only shrinks the shape, so the box is tight to within ~11 units at a 45° card.
The pad is one term: roulette's line style widens its box for the stroke and its glow, and this
one does not — the viewBox is byte-identical between `flat` and `line` for every spread, and
there is no `glow` option here. The formula carried both terms from M0 to M5 regardless.
**The box is computed from the emitted, already-rounded numbers**, so "every corner is inside the
viewBox" is exactly true rather than true-to-a-rounding.

`size` is the **width**; the height follows the viewBox.

## Hands — presets are data

A preset is *which cards and which layout*. The library contains **no evaluator**: nothing
computes a category from cards, nothing compares two hands, nothing scores, and there is no game
state. The arrow runs one way only — name → cards.

Every category is correct **by construction**, so there is no predicate a reader could mistake for
a scorer. One helper does all of it: `pick(stream, m, N)`, a partial Fisher–Yates returning `m`
distinct values whose prefix is stable in `m`.

| Preset | Construction | Default spread |
|---|---|---|
| `royal-flush` · `straight-flush` | run `SO.slice(s, s+5)` over `A23456789TJQKA`, one suit; `s = 9` **is** the royal, `s = 0` is the wheel | `row` |
| `four-of-a-kind` · `full-house` · `three-of-a-kind` · `two-pair` · `pair` | ranks by `pick`, suits by `pick` | `row` / `fan` |
| `flush` · `high-card` | a run with an interior rank dropped and one added outside `[s−1, s+5]` — four ranks spanning five positions with a hole, and a fifth that can neither fill nor extend it | `row` / `fan` |
| `straight` · `high-card` | one card's suit forced different from card 0's | `row` / `fan` |
| `blackjack` · `double-down` | A + a ten-value · the same two and a crosswise third | `pair` |

**`split` is not in v0.1.** It is two hands side by side, and every layout here places one group;
faking it by laying four cards in a row would draw something that is not a split. It waits for a
two-group layout, in the backlog.

Why no checks are needed: a paired hand cannot also be a flush (a pair is two suits) or a straight
(five distinct ranks are required), and `pick` guarantees distinct ranks. Display order is
high→low with grouped ranks first; **a comparator is not an evaluator** — it is ~20 B and it is
called `order`, not `rank`.

> **The seed never changes what the 7♥ looks like. It may change whether the 7♥ is in the hand.**

That is where the family's seed belongs. `cards` pins exact cards for anyone who needs a specific
picture, and the two namespaces are separate, so the same seed and preset give the same card set
under a different spread.

## Motion

Off by default. `motion: 'deal' | true`, `speed` divides the periods, `0` turns motion off.

- **CSS, not SMIL** — `prefers-reduced-motion` cannot gate SMIL without script (ADR 006).
- **`from` with no `to`.** The animation ends at identity, so `animation: none` under reduced
  motion leaves every card in its finished place. A `to`-based deal would strand a reduced-motion
  reader looking at the start state.
- **The whole start state starts inside the frame** — both the slide and the turn, because the
  framing pass never sees the start state and cannot make room for it. Both are derived from
  `pad`: the slide takes a quarter of it, the turn the angle that fits three fifths of it against
  the card's half-diagonal, and the rest is the viewBox's rounding. Tying only the slide to `pad`
  and leaving the turn free is what put card 0 of every spread 111–128 units outside the box
  through M4 (ADR 013).
- **An animated element never carries a `transform` attribute** — CSS `transform` would replace
  it. The placement transform sits on the outer `<g>`, the animation class on an inner one.
- Each card gets its own seeded class carrying its own `animation-delay`; no type, universal or
  `:nth-child` selectors, because the inline `<style>` is document-global.
- A deal is a one-shot flourish where roulette's spin is permanent, so it must not grow: the
  budget for it is ~0.35 KB, and a flip (which doubles a card's markup) and a riffle (whose
  keyframe count scales with the card count) are out.
- **`init()` does not gate on visibility.** Roulette pauses off screen because its motion is
  permanent; a deal is one-shot, so there is nothing to pause — but there is something to *delay*,
  and this version does not: a hand below the fold finishes dealing before the reader reaches it
  and they see only the rest state. Starting the deal on entry is in the backlog, not in v0.1.

## API

```js
Cards.card(opts)                 // → string. One card, face or back. Pure; Node and browser.
Cards.hand(opts)                 // → string. A spread — the heart of the library. Pure.
Cards.deck(opts)                 // → string. All 52 faces as one sheet. Pure.
Cards.palette(brand, {theme})    // → {heart, diamond, club, spade, gilt, stock, ink, back, background, halo}
Cards.init(el, opts)             // browser → {el, get(), set(opts), destroy()}
```

`mark()` is backlog: roulette added its emblem at M5 and paid a budget raise for it.

`deck()` is **its own output class** and says so: 13 × 4 cards, one defs block, `detail: 1` by
default, **~47 KB raw measured at M3** — against ~4.5 KB for a five-card hand. The earlier 18–28 KB
estimate was wrong: 52 cards at ~880 B each is what a sheet costs once every card carries an index
block and a pip field of its own. The per-picture ceiling is stated per
card, not per output, and `deck()` is the one call that puts all 17 fixed paths in one file, which
makes the no-signature test inspectable by eye.

### Options

Shared by `card()`, `hand()` and `deck()`:

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine), or a number taken as a 32-bit unsigned integer |
| `brand` | spintax triad `['#00abf3','#d6af3c','#a91455']` | hex or hex[] |
| `theme` | `'dark'` | `'dark'` \| `'light'` — derived colours only |
| `style` | `'flat'` | `'line'` \| `'flat'`; the back defaults to `line` under `theme: 'light'` |
| `detail` | `2` | 1 no lattice on backs · 2 standard |
| `weight` | `1` | line weight multiplier |
| `heart diamond club spade gilt stock ink back` | `'auto'` | any CSS colour string |
| `face` | `true` | `false` leaves the card unpainted — the airy treatment |
| `index` | `'both'` | `'both'` \| `'tl'` \| `'none'` |
| `pips` | `true` | `false` = index only |
| `lattice` | `'auto'` | `'trigon'` \| `'hex'` \| `'octagon'` \| `'none'` |
| `size` | — | width; the height follows the viewBox |
| `precision` | `0` | decimals for coordinates (angles are always 2) |
| `salt` | `''` | extra entropy for ids — two pictures of **the same card** with one seed on one page |
| `title` | — | `role="img"` + escaped `aria-label`; otherwise `aria-hidden="true"` |

`card()` adds `card` (`'QH'`, `'10S'`, `'??'`), `rank`, `suit`, `facedown` and `emblem`. There is
no `angle`: a card rotated inside a fixed viewBox clips at the corners, and a spread is where a
card is meant to be turned.
`hand()` adds `cards`, `preset`, `count` (precedence: `cards` > `preset` > `count`), `spread`,
`reveal`, `step`, `arc`, `lean`, `jitter`, `facedown` (`'all'`, `'first'`, `'last'`, a mask
`'01101'`, or indices), **`motion` (`'deal'` \| `true`) with `speed`**, and the framing pair
**`fit` and `pad`** (`'tight'`, `0.06`). All four groups are the hand's alone and are read by
nothing else: the deal has nothing to deal a single card against, and `card()` and `deck()` never
reach `frame()` — they hand a fixed box to `wrap()`, so `pad` and `fit` are silently inert there.
`card()` also takes `facedown` as a hand of one: `'none'` and a mask whose first slot is `0` leave
it face up.
`deck()` adds `facedown` in its `true` \| `'all'` form only — the per-slot forms have no slots to
address on a reference sheet. Its grid is fixed at 13 × 4: the `top` / `cut` / `stripes` / `dir`
knobs this line promised until M5 belonged to the deck-**body** design that became the `stack`
spread (backlog, above), and were never implemented.

## Determinism

- Every seeded parameter draws from its **own** sub-seed:
  `u(k) = mulberry32(fmix32(seed32 ^ imul(fnv(k), 0x9E3779B9)))`; a string seed goes through
  FNV-1a. No parameter reads a shared stream cursor, so adding a parameter never re-rolls a
  picture — the hexagons incident, where `count` moved an unrelated animation.
- **Namespaces:** `spread:*` placement · `card:*` the face · `back:*` the back · `hand:*` which
  cards · `deck:*` the sheet · `ids` (+ `salt`) tokens.
- **Per-card *identity* values are keyed by the card, not the slot** (`card:emblem:QH`). The queen
  of hearts keeps her emblem and her corner radius wherever she appears under one seed — in
  `card()`, in a fan, in a pile.
- **Ids are keyed by the card too.** The token stream is seeded with the rank and suit as well as
  `salt`, so two *different* cards under one seed can never collide on a page — a page that lays
  out a deck by calling `card()` 52 times would otherwise have every `<use>` resolve to the first
  card in the document. `salt` remains for the case it cannot solve: the same card twice.
- A placement is `(cx, cy, a)`, and may carry a fourth element: its **paint order**, which is how
  a heap is painted out of sequence without painting learning the layout's name (ADR 007 addendum).
- `count` **appends; it does not re-deal** — within a named spread, including the pile's paint
  order. `spread: 'auto'` is the one exemption, and by construction: it chooses the layout *from* the count, so adding a card may
  hand the picture to another layout. That is what `auto` is for, and it is the second reason
  (after the aspect swing) that it is opt-in rather than the default.
  The guarantee holds because the fan is anchored at card 0
  (`a_i = lean + i·Δ`) rather than centred — `frame()` recentres the picture, so anchoring costs
  nothing visually — and pinned on *relative* placements, which is the honest form.
- No `Math.random`, no `Date`. The default seed is fixed: a build must reproduce.
- **Contract:** same (seed, options) → byte-identical string within a minor version
  (roulette-lite's ADR 010, adopted here by ADR 001 — *this* repo's ADR 010 is the different
  rule that presets are data).
  **`brand` never touches geometry, `seed` never touches colour, and `brand` never changes which
  card is drawn.**

## No signature

Nothing in the output names or fingerprints the tool (ADR 005): no comments, `<desc>`/`<metadata>`,
`data-*`, `xlink`, `version`, library names. Every id, class and custom-property name is a seeded
token from `u('ids')` plus `salt`.

**With one carved exception, and it is counted: 17 fixed `d` values** — the 13 rank skeletons and
the 4 suit pips (ADR 005 here). The argument, in full, is in that ADR; in short: ADR 005 guards
tool-identity, not subject-identity, and roulette already ships fixed subject geometry unremarked
(`mark()`'s bars and hub, `table()`'s entire grid). Seeded letterforms were measured and rejected
on a stronger ground than cost — a seeded skeleton keeps its topology, so the fingerprint moves
into the grammar rather than leaving, and `polymorph` remains the family's answer to the grammar.
The honest counter is on the record too: a letterform is a design choice where a betting grid is
canonical, so this exception genuinely widens the surface ADR 005 protects.

`index: false` removes the 13; `pips: false` removes the 4; a back-only card emits neither. The
seeded stroke weight, the pip scale, the court ornament and the whole back are **not** part of the
exception — they vary, and a test proves it by requiring the court rosette and the back to
contribute **zero** seed-invariant `d` values.

## Performance and size

- Library: budget in `package.json` `config.sizeBudget`, measured by `npm run size` (terser in
  process + gzip level 9 — never the `gzip` CLI, whose header carries the file name). Provisional
  7680 B at M0, **frozen at 9088 B after M4** — measured 8747 + 2.5%, rounded to the next 128
  (ADR 009). From here that is room for fixes, not for features. The M0 forecast was 26% low, and
  the parts that missed were the estimated ones: everything measured before it was written came in
  on the number.
- Output, **measured over 60 seeds at M5** and stated as bands rather than ceilings: 4.4–8.0 KB
  raw for a five-card hand (median 5.9), 11.2–17.5 KB for a thirteen-card cascade (median 14.1),
  48.4–50.4 KB for `deck()`'s sheet. The M3 ceilings this line used to carry — ≤ 6 KB, ≤ 10 KB,
  ~47 KB — were written from single renders: the five-card one was over in 22 seeds of 60 and the
  thirteen-card one in **60 of 60**. What moves the number is not the spread but the mix of cards
  the seed deals: a court card is ~2.1 KB against ~1.2 KB for a spot card, so a hand of courts is
  nearly twice a hand of spots. A page reserving a byte budget should take the top of the band.

## Promotion

Credits live only in the README, the demo and package.json — never in the output. Demo panel and
footer: "Made in [301](https://301.st) · for [spintax.net](https://spintax.net)".

## Naming, layout, release

- Package `cards-lite`, global `Cards`, repo `investblog/cards-lite`, source `cards.js`, generated
  `cards.min.js` (not committed), types `cards.d.ts`.
- ES5 IIFE with a UMD tail: CommonJS gets `module.exports`, a browser gets `window.Cards`; default
  import only (ADR 007). ES5 is the syntax, not the runtime: `Math.imul` is fine.
- **ESLint 10** — the family pins 9.x and carries "eslint 10 across all four libs" in its backlog;
  a greenfield repo has no migration cost, so this one is the pilot (ADR 001).
- Release: OIDC trusted publishing after the house token bootstrap. **The account must be
  publish-ready first** — npm freezes an account for 72 hours after a recovery-code sign-in
  (roulette-lite, 2026-09-18).

## The browser gate, and how a check earns trust

`test/verify.html` is the half of the gate that needs a DOM: parsing, computed colour, hit
testing, rasterised pixels, CSS motion, `init()`. Everything that is arithmetic belongs in
`npm test` instead — the contrast floor started here and moved there, where it grew from one
brand to twenty-eight.

`node scripts/browser-gate.mjs` serves the repo and runs that page in **Chromium, Firefox and
WebKit, twice each** — once normally and once under `prefers-reduced-motion`, because the reduced
path is a different branch and a branch nobody runs is a branch nobody knows about.

**`--mutate` is the part that matters.** It breaks `cards.js` on purpose, one anchor at a time —
the deck missing from the exports, an unclosed `<defs>`, the index clamp cut, pins ignored, pips
unpainted, the M4 deal restored, the reduced-motion gate removed — and reports any check that
never went red. Five checks in this repo once passed against a library that was broken; each
looked careful, and the only thing that would have caught them was watching them fail. The rule
this enforces:

> A check earns trust by failing on demand. Add one, and add the mutation that reddens it in the
> same sitting — `--mutate` prints the ones you skipped.

The whole list has been seen red as of M5. A mutation whose anchor has moved is reported as a
problem rather than skipped quietly: a mutation that no longer applies proves nothing.

## Acceptance criteria (v0.1)

- `card()`, `hand()` and `deck()` run in Node ESM, CommonJS and a `<script>`.
- Same (seed, options) → identical bytes; the brand/seed independence tests pass, including
  "brand never changes which card is drawn".
- The 17-path exception test passes: the seed-invariant `d` set is exactly those 17, and the court
  emblem and back contribute none.
- Every card's four corners, re-derived longhand from the emitted transform, are inside the
  viewBox, for every spread × 60 seeds; the index band is unoccluded in every spread but `pile`
  and `stack`.
- The ten poker presets satisfy a **hand evaluator written longhand in the test file**.
- Both styles × both themes look right in a browser — a contact sheet per spread, shown to the
  user at M2 and M3.
- `npm run lint`, `npm test`, `npm run size` pass; `test/verify.html` (cache-busted) is ALL GREEN
  in Chromium, Firefox and WebKit, under `prefers-reduced-motion` and without it. Every check in
  it has been seen to fail against a deliberately broken library — five of them could not, once.

## See also

- `docs/decisions/` — the ADRs; `docs/TODO.md` — the backlog.
- Siblings: [roulette-lite](https://github.com/investblog/roulette-lite) (the direct parent),
  [trigons-lite](https://github.com/investblog/trigons-lite),
  [hexagons-lite](https://github.com/investblog/hexagons-lite),
  [octagons](https://github.com/investblog/octagons).
