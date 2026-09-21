// The colour engine and derive() were ported from hexagons-lite unchanged (ADR 001), and the
// family's promise is that a brand reads the same across the siblings — a page can put a hand of
// cards on a hexagon field and expect one palette, not two that nearly agree.
//
// "Byte-identical" was an assertion until M5.1. The fixture beside this file holds what the
// sibling really returns, captured from `hexagons.js @ 9f9b933`; pinning it here rather than
// importing the sibling keeps the test runnable anywhere — hexagons is browser-only (it assigns
// `window.Hexagons` with no module tail) and is not a dependency of this package.
//
// If this fails, one of the two engines drifted. Find out WHICH before regenerating the fixture:
// regenerating it silently is how a drift becomes the new truth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Cards from '../cards.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/palette-parity.json', import.meta.url), 'utf8'));

test('palette parity with hexagons-lite: stroke, background and halo, to the byte', () => {
	assert.ok(fixture.cases.length >= 16, 'the fixture still covers the brands it was made for');
	for (const c of fixture.cases) {
		const p = Cards.palette(c.brand, { theme: c.theme });
		const where = `${c.brand} ${c.theme}`;
		assert.deepEqual(p.stroke, c.colors, `${where}: the three stroke colours`);
		assert.equal(p.background, c.background, `${where}: background`);
		assert.equal(p.halo, c.halo, `${where}: halo`);
	}
});

test('and the card roles are NOT the sibling palette: this library adds its own', () => {
	// parity is about the shared engine, not about the whole palette — a guard against someone
	// "fixing" the test above by making palette() return hexagons' object
	const p = Cards.palette('#7c5cff');
	for (const role of ['heart', 'diamond', 'club', 'spade', 'gilt', 'stock', 'ink', 'back']) {
		assert.match(p[role], /^#[0-9a-f]{6}$/u, `${role} is a colour of this library's own`);
	}
	assert.notEqual(p.stock, p.background, 'the card stock is paper, not the field behind it');
});
