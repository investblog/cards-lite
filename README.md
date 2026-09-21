# cards-lite

Playing cards drawn by code. One call returns an SVG string — in Node at build time or in the
browser — so a static site gets its hero art with no script on the page. **`seed`** spins the
spread, the backs and the court emblems; **`brand`** spins the colours: a four-colour deck where
hearts, diamonds and clubs take your brand's hues, spades stay black and the face stays paper.
Fans, rows, cascades, stacks, heaps and blackjack pairs, flat or line art, with an optional deal
that stops for readers who asked for less motion. Zero dependencies, 8.7 KB gzipped.

[![npm](https://img.shields.io/npm/v/cards-lite.svg)](https://www.npmjs.com/package/cards-lite)
[![license](https://img.shields.io/npm/l/cards-lite.svg)](LICENSE)

**[Live demo →](https://investblog.github.io/cards-lite/)** — every option wired to a control, a
24-seed contact sheet, every spread, every named hand, and the 52-card deck.

## Install

```sh
npm install cards-lite
```

Or from a CDN, no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/cards-lite@0.1/cards.min.js"></script>
```

The file is one script in ES5 syntax that runs anywhere `Math.imul` does — current browsers and
supported Node releases (CI runs 22 and 24): a `<script>` gets the global `Cards`, Node and
bundlers get `module.exports`. Use the default import:

```js
import Cards from 'cards-lite';
```

## Use it

At build time — an Astro page, a static generator, anything that runs Node:

```js
const markup = Cards.hand({ seed: 'example.com', brand: '#7c5cff' });
// inline it: <div class="hero-art" aria-hidden="true" set:html={markup} />
```

In the browser:

```js
const hand = Cards.init('#hero-art', { seed: 42, preset: 'royal-flush', motion: 'deal' });
hand.set({ brand: '#c2410c' });   // re-renders; colours you pinned stay pinned
hand.destroy();
```

The SVG has a `viewBox` and no size of its own: size it with CSS — `svg { width: 100%; height:
auto; }` — or the `size` option. A spread's aspect depends on the spread, so name one if your page
reserves a fixed box (the table is in [docs/README.md](docs/README.md)); `spread: 'auto'` picks by
count and is deliberately not the default.

## The three calls

```js
Cards.hand({ seed: 7, spread: 'fan', count: 5 });       // a spread — the heart of the library
Cards.card({ card: 'QH', seed: 7 });                    // one card, 5:7
Cards.deck({ seed: 7 });                                // all 52 faces as one sheet (48-51 KB raw)
```

`hand()` takes the cards three ways, in this order of precedence:

```js
Cards.hand({ cards: 'AS KS QS JS 10S' });   // exactly these
Cards.hand({ preset: 'full-house' });       // a named hand, correct by construction
Cards.hand({ count: 5, seed: 3 });          // dealt from the seed
```

## Named hands

`preset` is **data, not an evaluator** — the library knows how to build a full house, never how to
recognise one (ADR 010). Every preset is correct by construction and reproducible from its seed:

`royal-flush` · `straight-flush` · `four-of-a-kind` · `full-house` · `flush` · `straight` ·
`three-of-a-kind` · `two-pair` · `pair` · `high-card` · `blackjack` · `double-down`

Each brings its own layout — blackjack the two-card pair, the poker hands a row or a fan — and an
explicit `spread` still wins. An unknown name draws a plain hand: the house never throws.

## Colour: a deck that stays a deck

You pass one to three brand colours. Each takes the suit nearest its hue, and the rest keep their
classic reds and blacks in your brand's key. Three roles are **always derived and never a brand
colour**: **spades** (black), the **ink** of the rules and borders, and the **stock** — the face is
paper in both themes, because a brand-coloured face stops reading as a card.

| Brand | Hearts | Diamonds | Clubs | Spades |
|---|---|---|---|---|
| spintax triad `#00abf3 #d6af3c #a91455` | the crimson | the blue | classic green | derived black |
| one blue | classic red | the blue | classic green | derived black |
| one red (`#c2410c`) | the red itself | classic blue | classic green | derived black |
| grey | classic red | classic blue | classic green | derived black |

Every role can be pinned with any CSS colour, including a custom property — which is how a site
with a light/dark toggle recolours an inline hand with no script:

```js
Cards.hand({ seed: 7, heart: 'var(--card-red, #c4356a)', stock: 'var(--paper, #f0f6fc)' });
```

`Cards.palette(brand, { theme })` returns the derived colours for either theme, so you can publish
them as your own custom properties at build time.

## Options

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine) or a 32-bit unsigned integer |
| `brand` | spintax triad | hex or up to three hexes |
| `theme` | `'dark'` | `'dark'` \| `'light'` — the **back** only; a face-up picture is the same bytes in both |
| `style` | `'flat'` | `'flat'` \| `'line'` — pips, courts and backs; under `theme: 'light'` the back defaults to `line` |
| `spread` | `'fan'` | `'fan'` \| `'row'` \| `'cascade'` \| `'stack'` \| `'pile'` \| `'pair'` \| `'auto'` |
| `cards`, `preset`, `count` | —, —, `5` | which cards, in that order of precedence |
| `reveal`, `step`, `arc`, `lean` | `'auto'` | the spread's shape, overriding the seed |
| `jitter` | `1` | multiplies every per-card wobble; `0` is machine-neat |
| `facedown` | `'none'` | `'all'` \| `'first'` \| `'last'` \| a mask `'01101'` \| indices. `card()` reads the same words as a hand of one; `deck()` takes `true` \| `'all'` only |
| `motion`, `speed` | `false`, `1` | `'deal'` — a one-shot CSS deal; `speed: 0` returns the static bytes |
| `heart diamond club spade gilt stock ink back` | `'auto'` | any CSS colour |
| `index`, `pips`, `face`, `emblem` | `'both'`, `true`, `true`, `true` | what the card carries |
| `lattice`, `detail` | `'auto'`, `2` | the back's pattern — `trigon`, `hex` or `octagon` from the sibling libraries |
| `weight` | `1` | line weight multiplier |
| `size` | — | width; the height follows the viewBox |
| `fit`, `pad` | `'tight'`, `0.06` | framing — `hand()` only: the other two calls draw into a fixed box |
| `salt` | `''` | the same card twice on one page |
| `title` | — | an accessible name; without it the picture is `aria-hidden` |

The full contract, including every seeded range and the aspect table, is
[docs/README.md](docs/README.md).

## The index always reads

A spread that overlaps clamps its own exposure so the top-left index of every card stays uncovered
— one exported constant, `Cards.IDX`. `pile` and `stack` are exempt and say so: hiding what is
underneath *is* the motif. An explicit `reveal` is honoured verbatim, seeded values are clamped.

## Motion

`motion: 'deal'` slides and turns each card into place, as CSS inside the SVG — no script on the
page. Both halves of that entry are measured against `pad`, so a card never starts outside the
frame and is never clipped on its way in — the turn is small for exactly that reason. The animation runs `from` an offset with no `to`, so
`prefers-reduced-motion: reduce` leaves every card exactly where it belongs rather than stranding
it at the start. Every class and keyframe name is seeded, so two hands on one page do not collide
as long as their cards or seeds differ — or, for the same hand twice, their `salt` does.

## Same seed, same bytes

The output for a given seed and options is byte-identical, and a seed is independent of the brand:
change the colours and no card moves; change the brand and it is still the same hand. Within a
minor version the output does not change; any change to it is a minor release with a line in the
changelog — pin the exact version if you render at build time.

Nothing in the output names this library: no comments, no metadata, every id, class and keyframe a
seeded token. The one exception is counted and tested — the 17 fixed path strings of the thirteen
rank glyphs and four suit pips, which are the subject itself and cannot vary without ceasing to be
a card (ADR 005).

## The family

cards-lite is a sibling of four zero-dependency SVG libraries by the same hands —
[roulette-lite](https://github.com/investblog/roulette-lite) (its direct parent, whose colour
engine and seeding it shares),
[trigons-lite](https://github.com/investblog/trigons-lite),
[hexagons-lite](https://github.com/investblog/hexagons-lite) and
[octagons](https://github.com/investblog/octagons) — whose lattices are what the card backs are
patterned with.

## Credits

Built by [301ST](https://301.st) for [spintax.net](https://spintax.net) — the same idea as a
spintax template: one source, a different result for every seed.

MIT © [301ST](https://301.st)
