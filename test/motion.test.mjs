// M4: the deal, and init(). What a browser must confirm is in verify.html; what can be pinned
// from the markup is pinned here — above all that motion changes nothing about the static
// picture, which is the rule the family wrote after a fill animation in hexagons re-rolled a
// field it had no business touching.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Cards from '../cards.js';

const ids = (s) => [...s.matchAll(/id="([a-z0-9]+)"/gu)].map((m) => m[1]);
const staticPart = (s) => s.replace(/<style>[\s\S]*?<\/style>/u, '').replace(/ class="[a-z0-9]+"/gu, '');

test('the deal is CSS, one keyframe, one class per card, and it is gated', () => {
	const svg = Cards.hand({ seed: 3, count: 5, motion: 'deal' });
	assert.equal((svg.match(/@keyframes/gu) || []).length, 1, 'one keyframe serves every card');
	assert.equal((svg.match(/ class="[a-z0-9]+"/gu) || []).length, 5, 'one class per card');
	assert.match(svg, /@media\(prefers-reduced-motion:reduce\)\{[^}]*\{animation:none\}\}/u);
	assert.doesNotMatch(svg, /<animate|SMIL/u, 'CSS, not SMIL (ADR 006)');
});

test('the animation runs FROM an offset and has no `to`', () => {
	// with no `to`, `animation: none` leaves the card where it belongs; a to-based deal would
	// strand a reduced-motion reader looking at the start state
	const svg = Cards.hand({ seed: 3, count: 4, motion: true });
	const kf = svg.match(/@keyframes [a-z0-9]+\{([\s\S]*?)\}\}/u)[1];
	assert.match(kf, /^from\{/u);
	assert.doesNotMatch(kf, /\bto\s*\{/u);
	assert.match(kf, /opacity:0/u);
});

test('an animated element never carries a transform attribute of its own', () => {
	// the placement transform sits on the outer group, the class on an inner one: a CSS
	// transform would replace the attribute rather than compose with it
	const svg = Cards.hand({ seed: 5, count: 3, motion: 'deal' });
	for (const m of svg.matchAll(/<g class="[a-z0-9]+"([^>]*)>/gu)) {
		assert.doesNotMatch(m[1], /transform/u, 'the animated group is transform-free');
	}
});

test('motion changes nothing in the static picture, and speed 0 is the static bytes', () => {
	const off = Cards.hand({ seed: 3, count: 5 });
	const on = Cards.hand({ seed: 3, count: 5, motion: 'deal' });
	assert.deepEqual(ids(on), ids(off), 'switching the deal on renames nothing');
	assert.equal(staticPart(on).replace(/<g>/gu, '').replace(/<\/g>/gu, ''),
		staticPart(off).replace(/<g>/gu, '').replace(/<\/g>/gu, ''));
	assert.equal(Cards.hand({ seed: 3, count: 5, motion: 'deal', speed: 0 }), off, 'speed 0 is off');
});

test('two hands with one seed and a salt share no class or keyframe name', () => {
	const a = Cards.hand({ seed: 4, count: 3, motion: 'deal' });
	const b = Cards.hand({ seed: 4, count: 3, motion: 'deal', salt: 'second' });
	const names = (s) => new Set([...s.matchAll(/[.@]?keyframes ([a-z0-9]+)|class="([a-z0-9]+)"/gu)]
		.map((m) => m[1] || m[2]));
	const [x, y] = [names(a), names(b)];
	assert.equal([...x].filter((k) => y.has(k)).length, 0);
});

test('init(): null for nothing, a handle for an element, and set() merges', () => {
	// a minimal stand-in for the DOM: enough to prove the contract without pulling in a browser,
	// which verify.html does properly at M5
	const made = [];
	globalThis.document = {
		querySelector: (sel) => (sel === '#there' ? made[0] : null),
	};
	const el = { innerHTML: '' };
	made.push(el);
	assert.equal(Cards.init('#nowhere'), null);
	const h = Cards.init('#there', { seed: 2, count: 3, stock: 'var(--paper)' });
	assert.equal(h.el, el);
	assert.ok(el.innerHTML.includes('<svg'), 'it drew');
	assert.ok(el.innerHTML.includes('var(--paper)'), 'the pin took');
	h.set({ brand: '#d97706' });
	assert.ok(el.innerHTML.includes('var(--paper)'), 'a pin survives a later brand change');
	assert.equal(h.get().count, 3, 'get() returns the merged options');
	h.destroy();
	assert.equal(el.innerHTML, '');
	delete globalThis.document;
});

test('init() can draw any of the three, and defaults to a hand', () => {
	const el = { innerHTML: '' };
	globalThis.document = { querySelector: () => el };
	Cards.init('#x', { seed: 1, draw: 'card', card: 'AS' });
	assert.ok(el.innerHTML.includes('viewBox="-250 -350 500 700"'), 'a single card');
	Cards.init('#x', { seed: 1 });
	assert.ok(!el.innerHTML.includes('viewBox="-250 -350 500 700"'), 'a hand by default');
	delete globalThis.document;
});

// ── what the M4 review caught ────────────────────────────────────────────

test('the deal travels no further than the pad, so nothing is clipped on entry', () => {
	// it started at -250,-245 against 30 units of slack, so the leading card of every spread was
	// outside the viewBox on its way in — and already at 0.70 opacity, which reads as a glitch
	for (const pad of [undefined, 0.02, 0.2]) {
		const svg = Cards.hand({ seed: 7, count: 5, motion: 'deal', pad });
		const t = svg.match(/translate\((-?[\d.]+)px,(-?[\d.]+)px\)/u);
		const slack = (pad == null ? 0.06 : pad) * 500;
		assert.ok(Math.abs(Number(t[1])) <= slack, `pad ${pad}: dx ${t[1]} within ${slack}`);
		assert.ok(Math.abs(Number(t[2])) <= slack, `pad ${pad}: dy ${t[2]} within ${slack}`);
	}
});

test('two different hands under one seed share no animation name', () => {
	// the motion stream was keyed by salt alone, so the names collided and — the inline style
	// being document-global — the later block's timing won for both hands
	const names = (s) => new Set([...s.matchAll(/@keyframes ([a-z0-9]+)|class="([a-z0-9]+)"/gu)]
		.map((m) => m[1] || m[2]));
	const a = names(Cards.hand({ seed: 4, cards: 'AS KS QS JS 10S', motion: 'deal' }));
	const b = names(Cards.hand({ seed: 4, cards: '2H 3D', motion: 'deal', speed: 3 }));
	assert.equal([...a].filter((k) => b.has(k)).length, 0);
});

test('init() cannot be steered into Object.prototype either', () => {
	const el = { innerHTML: '' };
	globalThis.document = { querySelector: () => el };
	for (const bad of ['constructor', 'toString', '__proto__']) {
		Cards.init('#x', { draw: bad, seed: 1 });
		assert.equal(typeof el.innerHTML, 'string', `draw ${bad} wrote a string`);
		assert.ok(el.innerHTML.startsWith('<svg'), `draw ${bad} drew a picture`);
	}
	delete globalThis.document;
});
