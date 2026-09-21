// M4: the named hands. The library has no evaluator and must not grow one (ADR 010), so this
// file carries its own — written out longhand, from the rules of poker and not from the library's
// construction — and reads the cards back out of the finished SVG. A test that shared the code's
// idea of a flush could not catch the code being wrong about one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Cards from '../cards.js';

const src = readFileSync(new URL('../cards.js', import.meta.url), 'utf8');
const list = (name) => src.match(new RegExp('var ' + name + ' = \\[\\n([\\s\\S]*?)\\n\\t\\];'))[1]
	.match(/'[^']*'/gu).map((x) => x.slice(1, -1));
const G = list('G'), PIP = list('PIP');

// Decode a rendered hand: the defs hold one path per distinct rank glyph and suit pip, and one
// group per card that uses them. Document order in the body is the order the cards were drawn.
function readHand(svg) {
	const defs = svg.slice(0, svg.indexOf('</defs>'));
	const body = svg.slice(svg.indexOf('</defs>'));
	const byId = {};
	for (const m of defs.matchAll(/<path id="([a-z0-9]+)" d="([^"]+)"/gu)) {
		const rank = G.indexOf(m[2]), suit = PIP.indexOf(m[2]);
		if (rank >= 0) byId[m[1]] = { rank };
		else if (suit >= 0) byId[m[1]] = { suit };
	}
	// the card groups nest (the index block is a group inside them), so balance the tags rather
	// than matching lazily to the first </g>, which lands inside the index
	const groups = {};
	for (let i = defs.indexOf('<g id="'); i >= 0; i = defs.indexOf('<g id="', i)) {
		const id = defs.slice(i + 7, defs.indexOf('"', i + 7));
		let depth = 0, j = i;
		for (;;) {
			const open = defs.indexOf('<g', j), close = defs.indexOf('</g>', j);
			if (close < 0) break;
			if (open >= 0 && open < close) { depth++; j = open + 2; } else {
				depth--; j = close + 4;
				if (depth === 0) break;
			}
		}
		const inner = defs.slice(i, j), card = {};
		for (const u of inner.matchAll(/<use href="#([a-z0-9]+)"/gu)) {
			const d = byId[u[1]];
			if (d && d.rank !== undefined) card.rank = d.rank;
			if (d && d.suit !== undefined) card.suit = d.suit;
		}
		// an ace and a court have no pips in the mirrored half — their suit is carried by the
		// mini pip in the index block, which is an inline path rather than a <use>
		if (card.suit === undefined) {
			for (const m of inner.matchAll(/<path d="([^"]+)"/gu)) {
				const k = PIP.indexOf(m[1]);
				if (k >= 0) card.suit = k;
			}
		}
		groups[id] = card;
		i = j;
	}
	const out = [];
	for (const m of body.matchAll(/<use href="#([a-z0-9]+)"\/>/gu)) {
		const card = groups[m[1]];
		if (card && card.rank !== undefined && card.suit !== undefined) out.push(card);
	}
	return out;
}

// ── the evaluator, written from the rules and not from the library ────────
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function category(cards) {
	const ranks = cards.map((c) => c.rank), suits = cards.map((c) => c.suit);
	const count = {};
	for (const r of ranks) count[r] = (count[r] || 0) + 1;
	const shape = Object.values(count).sort((a, b) => b - a).join('');
	const flush = suits.every((s) => s === suits[0]);
	// a straight: five distinct ranks that sit consecutively with the ace either low or high
	const distinct = [...new Set(ranks)];
	let straight = false, royal = false;
	if (distinct.length === 5) {
		// the ace sits at either end, so both orders are tried; "royal" means the run TOPS OUT on
		// the high ace, which is only meaningful in the second one — checking a position in the
		// ace-low order calls 9-10-J-Q-K a royal flush, which it is not
		const orders = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0]];
		for (let oi = 0; oi < 2; oi++) {
			const pos = distinct.map((r) => orders[oi].indexOf(r)).sort((a, b) => a - b);
			if (pos[4] - pos[0] === 4) {
				straight = true;
				if (oi === 1 && pos[4] === 12) royal = true; // 10 J Q K A
			}
		}
	}
	if (straight && flush) return royal ? 'royal-flush' : 'straight-flush';
	if (shape === '41') return 'four-of-a-kind';
	if (shape === '32') return 'full-house';
	if (flush) return 'flush';
	if (straight) return 'straight';
	if (shape === '311') return 'three-of-a-kind';
	if (shape === '221') return 'two-pair';
	if (shape === '2111') return 'pair';
	return 'high-card';
}

const POKER = ['royal-flush', 'straight-flush', 'four-of-a-kind', 'full-house', 'flush',
	'straight', 'three-of-a-kind', 'two-pair', 'pair', 'high-card'];

test('the decoder reads back exactly the cards it was given', () => {
	const cards = readHand(Cards.hand({ cards: 'AS KS QS JS 10S', spread: 'row' }));
	assert.equal(cards.length, 5);
	assert.deepEqual(cards.map((c) => RANK_ORDER[c.rank] + 'hdcs'[c.suit]), ['As', 'Ks', 'Qs', 'Js', '10s']);
});

test('every poker preset is the hand it names, over 200 seeds, by an evaluator of our own', () => {
	for (const name of POKER) {
		for (let seed = 1; seed <= 200; seed++) {
			const cards = readHand(Cards.hand({ preset: name, seed }));
			assert.equal(cards.length, 5, `${name} seed ${seed}: five cards`);
			const codes = cards.map((c) => c.rank + ':' + c.suit);
			assert.equal(new Set(codes).size, 5, `${name} seed ${seed}: no card twice`);
			assert.equal(category(cards), name, `${name} seed ${seed}: drew ${codes}`);
		}
	}
});

test('blackjack is an ace and a ten-value; double-down adds a third card', () => {
	for (let seed = 1; seed <= 100; seed++) {
		const bj = readHand(Cards.hand({ preset: 'blackjack', seed }));
		assert.equal(bj.length, 2, `seed ${seed}`);
		assert.equal(bj[0].rank, 0, 'the ace');
		assert.ok([9, 10, 11, 12].includes(bj[1].rank), `ten-value, got ${RANK_ORDER[bj[1].rank]}`);
		const dd = readHand(Cards.hand({ preset: 'double-down', seed }));
		assert.equal(dd.length, 3, `seed ${seed}`);
		assert.equal(dd[0].rank, 0);
		assert.ok([9, 10, 11, 12].includes(dd[1].rank));
	}
});

test('a preset keeps its cards when the spread changes, and cards still wins over preset', () => {
	const a = readHand(Cards.hand({ preset: 'full-house', seed: 12 }));
	const b = readHand(Cards.hand({ preset: 'full-house', seed: 12, spread: 'fan' }));
	assert.deepEqual(a.map((c) => c.rank + ':' + c.suit).sort(), b.map((c) => c.rank + ':' + c.suit).sort());
	// an explicit list overrides the preset entirely
	const c = readHand(Cards.hand({ preset: 'royal-flush', cards: '2H 3H 4H', seed: 1, spread: 'row' }));
	assert.deepEqual(c.map((x) => RANK_ORDER[x.rank] + 'hdcs'[x.suit]), ['2h', '3h', '4h']);
});

test('each preset brings its own layout, and an explicit spread still wins', () => {
	// the blackjack motifs default to the two-card pair layout, the poker hands to a row or a fan
	const vb = (o) => Cards.hand(o).match(/viewBox="([^"]+)"/u)[1];
	assert.equal(vb({ preset: 'blackjack', seed: 3 }), vb({ preset: 'blackjack', seed: 3, spread: 'pair' }));
	assert.equal(vb({ preset: 'flush', seed: 3 }), vb({ preset: 'flush', seed: 3, spread: 'row' }));
	assert.equal(vb({ preset: 'pair', seed: 3 }), vb({ preset: 'pair', seed: 3, spread: 'fan' }));
	assert.notEqual(vb({ preset: 'flush', seed: 3 }), vb({ preset: 'flush', seed: 3, spread: 'cascade' }));
});

test('an unknown preset draws a hand rather than throwing — the house never throws', () => {
	const svg = Cards.hand({ preset: 'five-of-a-kind', seed: 2 });
	assert.equal(readHand(svg).length, 5);
});

test('the library still carries no evaluator: nothing in it decides a category', () => {
	// the arrow runs one way only — name to cards. If any of these appear, ADR 010 has been lost.
	// Comments are stripped first: the source says "there is no isFlush() here", and a guard that
	// trips on the sentence promising a thing is absent is a guard that means nothing.
	const code = src.replace(/^\s*\/\/.*$/gmu, '');
	assert.doesNotMatch(code, /\bisFlush|isStraight|\bscore\b|\bbeats\b|\bwinner\b|compareHand/iu);
});

// ── what the M4 review caught; these keep it caught ──────────────────────

test('double-down never deals the same physical card twice', () => {
	// the third card drew its rank and its suit from streams that never saw the first two, so
	// 4.5% of seeds produced Ac 10s Ac — two identical cards side by side in the picture
	for (let seed = 1; seed <= 600; seed++) {
		const h = readHand(Cards.hand({ preset: 'double-down', seed }));
		assert.equal(h.length, 3, `seed ${seed}`);
		assert.equal(new Set(h.map((c) => c.rank + ':' + c.suit)).size, 3, `seed ${seed}: ${h.map((c) => RANK_ORDER[c.rank] + 'hdcs'[c.suit])}`);
	}
});

test('a preset name from outside cannot reach Object.prototype', () => {
	// `preset: 'toString'` found a function where a layout was expected and threw TypeError,
	// which breaks the promise that the house never throws — and a preset name can come
	// straight from a CMS field
	for (const bad of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
		const svg = Cards.hand({ preset: bad, seed: 1 });
		assert.ok(svg.startsWith('<svg'), `preset ${bad} still drew a hand`);
		assert.equal(readHand(svg).length, 5);
	}
});

test('the display order is the bigger group first, then high to low', () => {
	const name = (c) => RANK_ORDER[c.rank];
	const hi = (c) => (c.rank === 0 ? 13 : c.rank);
	for (const preset of ['flush', 'straight', 'four-of-a-kind', 'full-house', 'two-pair', 'pair']) {
		for (let seed = 1; seed <= 60; seed++) {
			const h = readHand(Cards.hand({ preset, seed }));
			const count = {};
			for (const c of h) count[name(c)] = (count[name(c)] || 0) + 1;
			for (let i = 1; i < h.length; i++) {
				const a = h[i - 1], b = h[i];
				const ca = count[name(a)], cb = count[name(b)];
				assert.ok(ca > cb || (ca === cb && hi(a) >= hi(b)),
					`${preset} seed ${seed}: ${h.map(name).join(' ')} is out of order at ${i}`);
			}
		}
	}
});
