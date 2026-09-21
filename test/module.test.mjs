// M0: the module contract (ADR 007) and the palette port (ADR 006). What this file proves is
// that the library loads the three ways the family promises, and that the four-colour deck comes
// out of the brand with the roles the spec names — before any card is drawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Cards from '../cards.js';

const require = createRequire(import.meta.url);
const SUITS = ['heart', 'diamond', 'club', 'spade'];

test('loads as an ES module default import and as CommonJS, and they are the same object', () => {
	const cjs = require('../cards.js');
	assert.equal(typeof Cards.card, 'function');
	assert.equal(typeof Cards.palette, 'function');
	assert.equal(Cards.card, cjs.card);
});

test('as a <script>: the UMD tail defines exactly one global and touches nothing else', () => {
	const src = readFileSync(new URL('../cards.js', import.meta.url), 'utf8');
	assert.match(src, /root\.Cards = api;/u);
	// module.exports is checked first, so a bundler never reaches the global branch
	assert.match(src, /typeof module === 'object' && module\.exports/u);
	assert.doesNotMatch(src, /window\.\w+\s*=/u);
});

test('the deck is four-coloured: every suit resolves, and none collides with another', () => {
	for (const brand of [undefined, '#00abf3', ['#00abf3', '#d6af3c', '#a91455'], '#8a8a8a', '#d97706']) {
		for (const theme of ['dark', 'light']) {
			const p = Cards.palette(brand, { theme });
			for (const k of [...SUITS, 'gilt', 'stock', 'ink', 'back']) {
				assert.match(p[k], /^#[0-9a-f]{6}$/u, `${k} for ${brand} ${theme}`);
			}
			assert.equal(new Set(SUITS.map((s) => p[s])).size, 4, `four distinct suits for ${brand} ${theme}`);
		}
	}
});

test('three roles are never a brand colour: the spade is near-black, the stock is paper', () => {
	// lch(14, …) and lch(96.5, …) land far from any brand colour given; checked as luminance
	// rather than as a hex string, so the test does not restate the formula it is checking
	const lum = (hex) => {
		const [r, g, b] = hex.slice(1).match(/../gu).map((h) => parseInt(h, 16) / 255)
			.map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	for (const brand of ['#00abf3', '#a91455', '#d6af3c', '#8a8a8a']) {
		const p = Cards.palette(brand);
		assert.ok(lum(p.spade) < 0.05, `spade stays black for ${brand}: ${p.spade}`);
		assert.ok(lum(p.stock) > 0.8, `stock stays paper for ${brand}: ${p.stock}`);
		assert.notEqual(p.stock, p.spade);
	}
});

test('the face is paper in both themes — a dark theme does not darken the card (ADR 011)', () => {
	assert.equal(Cards.palette('#00abf3', { theme: 'dark' }).stock,
		Cards.palette('#00abf3', { theme: 'light' }).stock);
});

test('card(): same seed same bytes, a viewBox of 5:7, and decoration unless titled', () => {
	assert.equal(Cards.card({ seed: 'a.example' }), Cards.card({ seed: 'a.example' }));
	assert.notEqual(Cards.card({ seed: 'a.example' }), Cards.card({ seed: 'b.example' }));
	const out = Cards.card({ seed: 1 });
	assert.ok(out.includes('viewBox="-250 -350 500 700"'));
	assert.ok(out.includes('aria-hidden="true"'));
	assert.ok(Cards.card({ seed: 1, title: 'Ace of spades' }).includes('role="img" aria-label="Ace of spades"'));
	assert.ok(Cards.card({ seed: 1, size: 140 }).includes('width="140" height="196"'));
});

test('brand never touches geometry, seed never touches colour', () => {
	const strip = (s) => s.replace(/(fill|stroke)="[^"]*"/gu, '$1=""');
	assert.equal(strip(Cards.card({ seed: 9, brand: '#00abf3' })), strip(Cards.card({ seed: 9, brand: '#d97706' })));
	const colours = (s) => [...new Set([...s.matchAll(/(?:fill|stroke)="(#[0-9a-f]+)"/gu)].map((m) => m[1]))].sort();
	assert.deepEqual(colours(Cards.card({ seed: 9 })), colours(Cards.card({ seed: 400 })));
});

test('pins pass through untouched and are escaped, never parsed', () => {
	const out = Cards.card({ seed: 3, stock: 'var(--paper)', ink: '"><script>' });
	assert.ok(out.includes('fill="var(--paper)"'));
	assert.ok(out.includes('&quot;&gt;&lt;script&gt;'));
	assert.doesNotMatch(out, /<script/u);
});

test('nothing in the output names the tool (ADR 005)', () => {
	for (let seed = 1; seed <= 25; seed++) {
		const out = Cards.card({ seed });
		assert.doesNotMatch(out, /<!--|<desc|<metadata|data-|xlink|version=|cards-lite|spintax|301\.st/iu, `seed ${seed}`);
	}
});
