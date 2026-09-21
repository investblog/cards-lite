// M3: the back, the court emblem, the remaining spreads and deck(). The centrepiece is the
// exception test: ADR 005 allows exactly 17 fixed `d` values, and this file is what keeps that
// number honest — including the part that proves the back and the emblem are genuinely seeded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Cards from '../cards.js';

const ds = (svg) => [...svg.matchAll(/ d="([^"]+)"/gu)].map((m) => m[1]);
const intersect = (sets) => sets.reduce((a, b) => new Set([...a].filter((x) => b.has(x))));

test('ADR 005: the seed-invariant paths of a card are exactly its rank and its suit', () => {
	for (const code of ['7h', 'Ad', '10c', 'Ks']) {
		const seen = [];
		for (let seed = 1; seed <= 100; seed++) seen.push(new Set(ds(Cards.card({ card: code, seed }))));
		const fixed = intersect(seen);
		assert.equal(fixed.size, 2, `${code}: ${[...fixed].map((d) => d.slice(0, 18)).join(' | ')}`);
	}
});

test('ADR 005: 52 cards contribute 17 fixed paths between them, and not one more', () => {
	const union = new Set();
	for (const suit of 'hdcs') {
		for (const rank of Cards.RANKS) {
			const seen = [];
			for (let seed = 1; seed <= 12; seed++) seen.push(new Set(ds(Cards.card({ card: rank + suit, seed }))));
			for (const d of intersect(seen)) union.add(d);
		}
	}
	assert.equal(union.size, 17, `expected 13 ranks + 4 suits, got ${union.size}`);
});

test('ADR 005: the back and the emblem contribute no fixed path — the scope is real', () => {
	// if either of these ever holds a constant `d`, the exception has quietly widened
	const backs = [];
	for (let seed = 1; seed <= 60; seed++) backs.push(new Set(ds(Cards.card({ seed, facedown: true }))));
	assert.equal(intersect(backs).size, 0, 'the back rebuilds every number in its tile from the pitch');

	const courts = [];
	for (let seed = 1; seed <= 60; seed++) courts.push(new Set(ds(Cards.card({ card: 'Qh', seed }))));
	// a court is a card: the only fixed paths it may carry are its own rank and suit
	assert.equal([...intersect(courts)].length, 2, 'the rosette and its spokes are seeded');
});

test('the back: a seeded pattern, all three lattices in play, detail 1 drops it', () => {
	const kinds = new Set();
	for (let seed = 1; seed <= 60; seed++) {
		const svg = Cards.card({ seed, facedown: true });
		const tile = svg.match(/<pattern id="([a-z0-9]+)"[^>]*width="([\d.]+)" height="([\d.]+)"/u);
		assert.match(tile[1], /^[a-z][a-z0-9]{5}$/u, 'the pattern id is a seeded token (ADR 005)');
		const d = svg.match(/<pattern[\s\S]*? d="([^"]+)"/u)[1];
		kinds.add((d.match(/M/gu) || []).length); // trigon 5, octagon 8, hex 7
		assert.ok(Number(tile[2]) >= 26 && Number(tile[2]) <= 100, 'tile within the seeded pitch range');
	}
	assert.equal(kinds.size, 3, `all three lattices appear, saw ${[...kinds]}`);
	assert.doesNotMatch(Cards.card({ seed: 2, facedown: true }), /clipPath/u, 'the rounded rect is the clip');
	assert.doesNotMatch(Cards.card({ seed: 2, facedown: true, detail: 1 }), /<pattern/u);
	assert.doesNotMatch(Cards.card({ seed: 2, facedown: true, lattice: 'none' }), /<pattern/u);
});

test('every spread frames its cards, whatever the layout', () => {
	const body = (s) => s.slice(s.indexOf('</defs>') + 7);
	for (const spread of ['fan', 'row', 'cascade', 'stack', 'pile', 'pair']) {
		for (let seed = 1; seed <= 60; seed++) {
			const svg = Cards.hand({ seed, spread, count: spread === 'pair' ? 2 : 5 });
			const [bx, by, bw, bh] = svg.match(/viewBox="([^"]+)"/u)[1].split(' ').map(Number);
			for (const m of body(svg).matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)(?: rotate\((-?[\d.]+)\))?/gu)) {
				const x = Number(m[1]), y = Number(m[2]), a = Number(m[3] || 0) * Math.PI / 180;
				const cs = Math.cos(a), sn = Math.sin(a);
				for (const [dx, dy] of [[-250, -350], [250, -350], [250, 350], [-250, 350]]) {
					const px = x + dx * cs - dy * sn, py = y + dx * sn + dy * cs;
					assert.ok(px >= bx - 0.6 && px <= bx + bw + 0.6, `${spread} ${seed}: x`);
					assert.ok(py >= by - 0.6 && py <= by + bh + 0.6, `${spread} ${seed}: y`);
				}
			}
		}
	}
});

// The acceptance criterion in its own words: the index band is unoccluded in every spread but
// `pile` and `stack`. Not by a proxy on dx — by carrying the index's own five points into layout
// space and then into the local space of every card painted after it, which is the only form that
// survives a layout gaining rotation.
const EM = [[-216, -306], [-152, -306], [-152, -210], [-216, -210], [-184, -258]];
function placements(svg) {
	const body = svg.slice(svg.indexOf('</defs>'));   // <defs> carries groups of its own
	return [...body.matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)(?: rotate\((-?[\d.]+)\))?"/gu)]
		.map((m) => [Number(m[1]), Number(m[2]), Number(m[3] || 0) * Math.PI / 180]);
}
// how deep the index point sits inside a later card: positive means covered
function buriedDepth(svg) {
	const P = placements(svg);
	let deepest = -1e9;
	for (let i = 0; i < P.length; i++) {
		const [cx, cy, a] = P[i], co = Math.cos(a), si = Math.sin(a);
		for (const [px, py] of EM) {
			const X = cx + px * co - py * si, Y = cy + px * si + py * co;
			for (let j = i + 1; j < P.length; j++) {
				const [ox, oy, b] = P[j], cb = Math.cos(-b), sb = Math.sin(-b);
				const dx = X - ox, dy = Y - oy;
				const lx = dx * cb - dy * sb, ly = dx * sb + dy * cb;
				deepest = Math.max(deepest, Math.min(250 - Math.abs(lx), 350 - Math.abs(ly)));
			}
		}
	}
	return deepest;
}

test('no overlapping spread covers an index, over 60 seeds and three counts', () => {
	for (const spread of ['fan', 'row', 'cascade', 'pair']) {
		for (let seed = 1; seed <= 60; seed++) {
			for (const count of [2, 3, 5]) {
				const d = buriedDepth(Cards.hand({ seed, spread, count }));
				assert.ok(d < 0, `${spread} seed ${seed} count ${count}: an index is ${Math.round(d)} units under a later card`);
			}
		}
	}
});

test('and pile and stack DO cover one — the exemption is the motif, not an oversight', () => {
	// a heap that hides nothing is not a heap. If this ever goes quiet, the exemption written in
	// the spec has become a claim about nothing.
	for (const spread of ['pile', 'stack']) {
		let covered = 0;
		for (let seed = 1; seed <= 60; seed++) if (buriedDepth(Cards.hand({ seed, spread, count: 5 })) > 0) covered++;
		assert.ok(covered > 30, `${spread}: only ${covered} of 60 seeds hide an index`);
	}
});

test('cascade never covers an index: dx cannot fall below IDX (ADR 003)', () => {
	for (let seed = 1; seed <= 40; seed++) {
		const svg = Cards.hand({ seed, spread: 'cascade', count: 4 });
		const xs = [...svg.slice(svg.indexOf('</defs>')).matchAll(/translate\((-?[\d.]+) /gu)].map((m) => Number(m[1]));
		for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= Cards.IDX - 1, `seed ${seed}: ${xs[i] - xs[i - 1]}`);
	}
});

test('facedown takes all its forms, and jitter 0 is machine-neat', () => {
	const backs = (s) => (s.match(/<pattern/gu) || []).length;
	assert.equal(backs(Cards.hand({ seed: 5, count: 4, facedown: 'all' })), 1, 'one pattern serves every back');
	assert.ok(Cards.hand({ seed: 5, count: 4, facedown: 'all' }).includes('url(#'));
	assert.equal(backs(Cards.hand({ seed: 5, count: 4 })), 0);
	for (const [f, n] of [['first', 1], ['last', 1], ['01101', 3], [[0, 2], 2]]) {
		const svg = Cards.hand({ seed: 5, count: 5, facedown: f, spread: 'row' });
		assert.equal((svg.match(/url\(#/gu) || []).length, n, `facedown ${f}`);
	}
	// machine-neat: the step between cards is the same every time, and jitter 1 breaks that
	const steps = (o) => {
		const s2 = Cards.hand(Object.assign({ seed: 5, spread: 'row', count: 5 }, o));
		const xs = [...s2.slice(s2.indexOf('</defs>')).matchAll(/translate\((-?[\d.]+) /gu)].map((m) => Number(m[1]));
		return xs.slice(1).map((x, i) => x - xs[i]);
	};
	// at precision 0 a neat step still lands on either side of a whole unit, so the honest
	// invariant is a spread of at most one unit — jitter 1 is visibly wider than that
	const spread0 = steps({ jitter: 0 }), spread1 = steps({ jitter: 1 });
	assert.ok(Math.max(...spread0) - Math.min(...spread0) <= 1, `jitter 0 is neat: ${spread0}`);
	assert.ok(Math.max(...spread1) - Math.min(...spread1) > 1, `jitter 1 wobbles: ${spread1}`);
});

test('auto picks a layout by count and is never the default', () => {
	assert.equal(Cards.hand({ seed: 1, count: 5 }), Cards.hand({ seed: 1, count: 5, spread: 'fan' }), 'the default is fan');
	const seen = new Set();
	for (let seed = 1; seed <= 40; seed++) seen.add(Cards.hand({ seed, count: 5, spread: 'auto' }).match(/viewBox="([^"]+)"/u)[1]);
	assert.ok(seen.size > 3, 'auto really varies the layout');
	assert.equal(Cards.hand({ seed: 1, count: 2, spread: 'auto' }),
		Cards.hand({ seed: 1, count: 2, spread: 'pair' }), 'two cards go to pair');
});

test('deck(): 52 faces, one defs block, and the sheet is its own output class', () => {
	const svg = Cards.deck({ seed: 6 });
	const body = svg.slice(svg.indexOf('</defs>') + 7);
	assert.equal((body.match(/<g transform="translate\(/gu) || []).length, 52);
	assert.equal((svg.match(/<defs>/gu) || []).length, 1);
	// 13 rank glyphs and 4 suit pips, each defined once for the whole sheet
	assert.equal((svg.match(/<path id="/gu) || []).length, 17);
	// measured at M3: ~47 KB. The sheet is a reference, not a hero image, and the spec says so
	assert.ok(svg.length > 30000 && svg.length < 60000, `sheet is ${svg.length} B`);
	assert.ok(Cards.deck({ seed: 6 }).includes('viewBox="0 0 7060 3000"'));
});

// ── what the Codex review of M3 caught; these keep it caught ──────────────

test('an explicit list never loses a card: the spread gives way instead', () => {
	const body = (s) => s.slice(s.indexOf('</defs>') + 7);
	const drawn = (o) => (body(Cards.hand(o)).match(/<g transform="translate\(/gu) || []).length;
	// pair caps at 3, so five named cards must switch the layout rather than drop two
	assert.equal(drawn({ cards: 'AS KS QS JS 10S', spread: 'pair', seed: 2 }), 5);
	assert.equal(drawn({ cards: 'AS KS QS JS 10S', spread: 'row', seed: 2 }), 5);
	const twenty = Array.from({ length: 20 }, (_, i) => Cards.RANKS[i % 13] + 'hdcs'[i % 4]).join(' ');
	assert.equal(drawn({ cards: twenty, spread: 'fan', seed: 2 }), 20, 'twenty named cards all appear');
	// a bare count still clamps silently — the house never throws
	assert.equal(drawn({ count: 30, spread: 'fan', seed: 2 }), 10);
});

test('a light theme draws the back in contours, a dark one fills it (ADR 011)', () => {
	const fills = (o) => (Cards.card(Object.assign({ seed: 3, facedown: true }, o)).match(/fill="#[0-9a-f]{6}"/gu) || []).length;
	assert.ok(fills({ theme: 'light' }) < fills({ theme: 'dark' }), 'light leans on the outline');
	// an explicit style still wins, in both directions
	assert.equal(fills({ theme: 'light', style: 'flat' }), fills({ theme: 'dark', style: 'flat' }));
});

test('a pile is painted in a seeded order, but every card keeps its own place', () => {
	const order = (seed) => [...Cards.hand({ seed, spread: 'pile', count: 6 })
		.slice(Cards.hand({ seed, spread: 'pile', count: 6 }).indexOf('</defs>'))
		.matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)/gu)].map((m) => m[1] + ',' + m[2]);
	const seen = new Set();
	for (let seed = 1; seed <= 20; seed++) seen.add(order(seed).join('|'));
	assert.ok(seen.size > 15, 'the heap is shuffled, not dealt in order');
	// the set of places is the same whichever order they are painted in
	const five = new Set(order(7));
	const six = new Set([...Cards.hand({ seed: 7, spread: 'pile', count: 7 })
		.slice(Cards.hand({ seed: 7, spread: 'pile', count: 7 }).indexOf('</defs>'))
		.matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)/gu)].map((m) => m[1] + ',' + m[2]));
	assert.equal([...five].filter((x) => six.has(x)).length, five.size, 'count appends: every earlier place survives');
	// and the ORDER survives too, not only the set: the z key is a pure function of the index
	const seq = (nn) => {
		const svg = Cards.hand({ seed: 7, spread: 'pile', count: nn });
		return [...svg.slice(svg.indexOf('</defs>')).matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)/gu)]
			.map((m) => m[1] + ',' + m[2]);
	};
	const before = seq(6), after = seq(7);
	const at = before.map((x) => after.indexOf(x));
	assert.ok(at.every((v, i) => v >= 0 && (i === 0 || v > at[i - 1])), 'a seventh card slots in without reshuffling');
});

test('count appends for every NAMED spread; auto is the stated exemption', () => {
	const body = (s) => s.slice(s.indexOf('</defs>') + 7);
	const rel = (o) => {
		const p = [...body(Cards.hand(o)).matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\)(?: rotate\((-?[\d.]+)\))?/gu)]
			.map((m) => [Number(m[1]), Number(m[2]), Number(m[3] || 0)]);
		return p.slice(1).map(([x, y, a], i) => [x - p[i][0], y - p[i][1], a - p[i][2]].join());
	};
	// pile is not in this list on purpose: its document order is its PAINT order, so consecutive
	// differences are not its invariant. Its own test above pins both the places and the order.
	for (const spread of ['fan', 'row', 'cascade', 'stack', 'pair']) {
		const five = rel({ seed: 12, spread, count: 5 }), six = rel({ seed: 12, spread, count: 6 });
		assert.deepEqual(six.slice(0, five.length), five, `${spread} appends`);
	}
	// auto chooses the layout FROM the count, so adding a card may hand the picture to another
	// layout — documented, and the reason auto is opt-in (spec: Determinism)
	assert.ok(Cards.hand({ seed: 3, spread: 'auto', count: 2 }) !== Cards.hand({ seed: 3, spread: 'auto', count: 3 }));
});
