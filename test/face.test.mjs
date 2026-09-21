// M2: the face and the first two spreads. The invariants here are the ones a browser cannot be
// asked about cheaply — glyph well-formedness, the pip arithmetic, and the framing box.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Cards from '../cards.js';

const src = readFileSync(new URL('../cards.js', import.meta.url), 'utf8');
const list = (name) => src.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\n\\t\\];'))[1]
	.match(/'[^']*'/gu).map((x) => x.slice(1, -1));

test('every glyph is well formed: a Q chain carries pairs of pairs, and nothing else sneaks in', () => {
	// This is the check that caught the 6 and the 9 before a browser did: both had two spare
	// numbers at the end of a Q chain, which SVG reports only as "Unexpected end of attribute".
	const NEED = { M: 2, L: 2, Q: 4, H: 1, V: 1, Z: 0, z: 0 };
	for (const [name, paths] of [['G', list('G')], ['PIP', list('PIP')]]) {
		for (const d of paths) {
			for (const part of d.split(/(?=[A-Za-z])/u)) {
				const cmd = part[0];
				if (name === 'PIP' && cmd !== cmd.toUpperCase()) continue; // pips may curve, arc and go relative
				if (name === 'PIP' && 'CA'.includes(cmd)) continue;
				assert.ok(cmd in NEED, `${name}: unknown command ${cmd} in ${d.slice(0, 20)}`);
				const nums = (part.slice(1).match(/-?\d*\.?\d+/gu) || []).length;
				if (NEED[cmd]) assert.equal(nums % NEED[cmd], 0, `${name}: ${cmd} has ${nums} numbers in ${d.slice(0, 24)}`);
			}
		}
	}
});

test('the alphabet is 13 ranks and 4 suits, every shape distinct', () => {
	assert.equal(Cards.RANKS.length, 13);
	assert.equal(Cards.SUITS.length, 4);
	assert.equal(new Set(list('G')).size, 13);
	assert.equal(new Set(list('PIP')).size, 4);
});

// how many pips a card actually renders: slots inside the mirrored group are painted twice
const pipCount = (svg) => {
	const pid = svg.match(/<path id="([a-z0-9]+)" d="M0 34C/u) || svg.match(/<path id="([a-z0-9]+)" d="M0-3/u)
		|| svg.match(/<path id="([a-z0-9]+)" d="M-4 6A/u);
	const id = pid[1];
	const half = svg.match(/<g id="[a-z0-9]+">([\s\S]*?)<\/g><\/defs>/u)[1];
	const all = (svg.match(new RegExp(`href="#${id}"`, 'gu')) || []).length;
	const inHalf = (half.match(new RegExp(`href="#${id}"`, 'gu')) || []).length;
	const mini = 0; // the index mini pip is an inline <path>, not a <use>
	return 2 * inHalf + (all - inHalf) + mini;
};

test('the pip field draws exactly the rank it names, ace to ten', () => {
	for (let i = 0; i < 10; i++) {
		const rank = Cards.RANKS[i];
		const svg = Cards.card({ card: rank + 'h', seed: 4 });
		assert.equal(pipCount(svg), i + 1, `${rank} of hearts draws ${i + 1} pips`);
	}
});

test('the mirror: one group, used twice, the second turned 180°', () => {
	const svg = Cards.card({ card: '7s', seed: 4 });
	const id = svg.match(/<g id="([a-z0-9]+)">/u)[1];
	assert.equal((svg.match(new RegExp(`href="#${id}"`, 'gu')) || []).length, 2);
	assert.ok(svg.includes(`<use href="#${id}" transform="rotate(180)"/>`));
});

test('courts carry no pip field, and index:none / pips:false remove what they say', () => {
	for (const rank of ['J', 'Q', 'K']) {
		const svg = Cards.card({ card: rank + 'd', seed: 4 });
		assert.ok(svg.includes('scale(2.4)'), `${rank} has its placeholder centre pip`);
	}
	const bare = Cards.card({ card: '9c', seed: 4, index: 'none', pips: false });
	assert.doesNotMatch(bare, /translate\(-184/u, 'no index block');
	const tl = Cards.card({ card: '9c', seed: 4, index: 'tl' });
	assert.equal((tl.match(/translate\(-184 -258\)/gu) || []).length, 1, 'one index, not mirrored');
});

test('ids are keyed by what is drawn: two different pictures under one seed cannot collide', () => {
	const ids = (s) => new Set([...s.matchAll(/id="([a-z0-9]+)"/gu)].map((m) => m[1]));
	const both = (a, b) => [...a].filter((x) => b.has(x)).length;
	const as = ids(Cards.card({ card: 'AS', seed: 3 })), kh = ids(Cards.card({ card: 'KH', seed: 3 }));
	assert.equal(both(as, kh), 0, 'two cards');
	const h1 = ids(Cards.hand({ cards: 'AS KS QS JS 10S', seed: 3 })), h2 = ids(Cards.hand({ seed: 3 }));
	assert.equal(both(h1, h2), 0, 'two hands');
	assert.equal(both(h1, ids(Cards.hand({ cards: 'AS KS QS JS 10S', seed: 3, salt: 'b' }))), 0, 'salt separates');
	assert.equal(both(as, h1), 0, 'a card against a hand');
});

// every card's four corners, re-derived longhand from the emitted transform
const body = (svg) => svg.slice(svg.indexOf('</defs>') + 7);
const corners = (svg) => {
	const out = [];
	// only the body: the index blocks and the mini pips live inside <defs>
	for (const m of body(svg).matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)(?: rotate\((-?[\d.]+)\))?"/gu)) {
		const x = Number(m[1]), y = Number(m[2]), a = Number(m[3] || 0) * Math.PI / 180;
		const cs = Math.cos(a), sn = Math.sin(a);
		for (const [dx, dy] of [[-250, -350], [250, -350], [250, 350], [-250, 350]]) {
			out.push([x + dx * cs - dy * sn, y + dx * sn + dy * cs]);
		}
	}
	return out;
};

test('framing: every corner of every card lands inside the viewBox, and the box is tight', () => {
	for (const spread of ['fan', 'row']) {
		for (let seed = 1; seed <= 40; seed++) {
			const svg = Cards.hand({ seed, spread, count: 5 });
			const [bx, by, bw, bh] = svg.match(/viewBox="([^"]+)"/u)[1].split(' ').map(Number);
			const pts = corners(svg);
			assert.equal(pts.length, 20, `${spread} seed ${seed}: five cards`);
			let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
			for (const [x, y] of pts) {
				assert.ok(x >= bx - 0.6 && x <= bx + bw + 0.6, `${spread} seed ${seed}: x ${x} inside`);
				assert.ok(y >= by - 0.6 && y <= by + bh + 0.6, `${spread} seed ${seed}: y ${y} inside`);
				l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y);
			}
			// tight: each side is touched within the pad, not merely safe
			const pad = 0.06 * 500 + 1;
			assert.ok(l - bx <= pad && by + bh - b <= pad, `${spread} seed ${seed}: box hugs the cards`);
		}
	}
});

test('count appends, it does not re-deal', () => {
	const rel = (svg) => {
		const p = [...body(svg).matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)(?: rotate\((-?[\d.]+)\))?"/gu)]
			.map((m) => [Number(m[1]), Number(m[2]), Number(m[3] || 0)]);
		return p.slice(1).map(([x, y, a], i) => [x - p[i][0], y - p[i][1], a - p[i][2]].map((v) => v.toFixed(3)).join());
	};
	for (const spread of ['fan', 'row']) {
		const five = rel(Cards.hand({ seed: 11, spread, count: 5 }));
		const six = rel(Cards.hand({ seed: 11, spread, count: 6 }));
		assert.deepEqual(six.slice(0, five.length), five, `${spread}: the first five keep their relative places`);
	}
});

test('a hand is deterministic, capped, and takes an explicit list verbatim', () => {
	assert.equal(Cards.hand({ seed: 'a.example' }), Cards.hand({ seed: 'a.example' }));
	assert.notEqual(Cards.hand({ seed: 'a.example' }), Cards.hand({ seed: 'b.example' }));
	const wide = Cards.hand({ seed: 2, count: 30 });
	assert.equal((body(wide).match(/<g transform="translate\(/gu) || []).length, 10, 'the fan caps at 10');
	const royal = Cards.hand({ cards: 'AS KS QS JS 10S', spread: 'row', seed: 3 });
	for (const d of ['M-24 48 0-48 24 48', 'M-21 -46V48', 'M0 -46Q23', 'M13 -46V20', 'M-40 -38-31 -46V48']) {
		assert.ok(royal.includes(d), 'the royal flush draws the rank it was given');
	}
	assert.equal((royal.match(/<path id="[a-z0-9]+" d="M0-36C10/gu) || []).length, 1, 'one spade pip serves all five');
});

test('no signature, over both drawing calls (ADR 005)', () => {
	for (let seed = 1; seed <= 30; seed++) {
		for (const svg of [Cards.card({ seed }), Cards.hand({ seed })]) {
			assert.doesNotMatch(svg, /<!--|<desc|<metadata|<text|data-|xlink|version=|cards-lite|spintax|301\.st/iu, `seed ${seed}`);
			for (const m of svg.matchAll(/id="([a-z0-9]+)"/gu)) assert.match(m[1], /^[a-z][a-z0-9]{5}$/u);
		}
	}
});
