/*!
 * cards-lite — procedural playing-card illustrations as an SVG string.
 * MIT © 301ST (https://301.st) · for spintax.net
 *
 * One file, ES5, zero dependencies. Works as a <script> (defines `Cards`) and as a CommonJS
 * module (Node, bundlers) — ADR 001/007. The spec is docs/README.md: change the doc before the
 * code. The colour engine and the seed machinery are the family's, ported unchanged from
 * roulette-lite (which took them from hexagons-lite); a fixture test pins that they still agree.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.Cards = api;
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var DEFAULT_BRAND = ['#00abf3', '#d6af3c', '#a91455'];
	// card space: 5:7 at 500×700, origin at the card centre (ADR 003). The lower half of a
	// card is the upper half under rotate(180), so the mirror is one attribute, not a copy.
	var W = 500, H = 700, HW = W / 2, HH = H / 2;
	var IDX = 140; // the index reach: the strip that must stay uncovered for a rank to read
	var DEG = Math.PI / 180;
	var SQRT3 = Math.sqrt(3);
	var A_REG = (2 - Math.SQRT2) / 2; // 0.29289… exact regular octagon

	// ── numbers and markup ──────────────────────────────────────────────────

	// Round, then String: no exponent notation, and no "-0" (it is a different string from "0").
	function n(v, d) {
		var p = Math.pow(10, d || 0), r = Math.round(v * p) / p;
		return String(r === 0 ? 0 : r);
	}
	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	// attrs is a flat [name, value, …] list; a null value drops the attribute
	function el(tag, attrs, inner) {
		var s = '<' + tag;
		for (var i = 0; i < attrs.length; i += 2) if (attrs[i + 1] != null) s += ' ' + attrs[i] + '="' + attrs[i + 1] + '"';
		return inner == null ? s + '/>' : s + '>' + inner + '</' + tag + '>';
	}

	// ── seeds ───────────────────────────────────────────────────────────────

	function fnv(str) {
		var h = 0x811c9dc5;
		for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
		return h >>> 0;
	}
	function fmix(h) {
		h = Math.imul(h ^ h >>> 16, 0x85ebca6b);
		h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
		return (h ^ h >>> 16) >>> 0;
	}
	function mulberry(a) {
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var x = Math.imul(a ^ (a >>> 15), 1 | a);
			x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}
	// Every parameter reads its OWN stream, keyed by name. Nothing shares a cursor, so adding a
	// parameter later never re-rolls an existing wheel (the hexagons lesson, ADR 010).
	function streams(seed) {
		var s = typeof seed === 'number' ? seed >>> 0 : fnv(String(seed));
		return function (key) { return mulberry(fmix(s ^ Math.imul(fnv(key), 0x9E3779B9))); };
	}

	// ── auto-palette: sRGB <-> CIE LCh(ab), D65 — ported unchanged from hexagons (ADR 004) ──

	function parseColor(str) {
		str = String(str).trim();
		if (str.charAt(0) === '#') {
			var h = str.slice(1);
			if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
			var v = parseInt(h, 16);
			return [v >> 16 & 255, v >> 8 & 255, v & 255];
		}
		var m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
		return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
	}
	function toHex(c) {
		return '#' + ((1 << 24) + ((c[0] | 0) << 16) + ((c[1] | 0) << 8) + (c[2] | 0)).toString(16).slice(1);
	}
	function s2l(u) { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }
	function l2s(u) { return 255 * (u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055); }
	function fwd(t) { return t > 216 / 24389 ? Math.pow(t, 1 / 3) : (24389 / 27 * t + 16) / 116; }
	function inv(t) { var c = t * t * t; return c > 216 / 24389 ? c : (116 * t - 16) * 27 / 24389; }

	function rgb2lch(rgb) {
		var r = s2l(rgb[0]), g = s2l(rgb[1]), b = s2l(rgb[2]);
		var x = (0.41246 * r + 0.35758 * g + 0.18044 * b) / 0.95047;
		var y = 0.21267 * r + 0.71515 * g + 0.07218 * b;
		var z = (0.01933 * r + 0.11919 * g + 0.9503 * b) / 1.08883;
		var fx = fwd(x), fy = fwd(y), fz = fwd(z);
		var L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
		var C = Math.sqrt(A * A + B * B);
		var H = Math.atan2(B, A) * 180 / Math.PI;
		return [L, C, (H + 360) % 360];
	}
	function lch2lin(L, C, H) {
		var A = C * Math.cos(H * Math.PI / 180), B = C * Math.sin(H * Math.PI / 180);
		var fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
		var x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
		return [
			3.24045 * x - 1.53714 * y - 0.49853 * z,
			-0.96927 * x + 1.87601 * y + 0.04156 * z,
			0.05564 * x - 0.20403 * y + 1.05723 * z
		];
	}
	// Gamut policy: hold L and H, reduce C until inside sRGB. Never channel-clip — clipping
	// shifts hue, and hue is the brand's identity.
	function lch2rgb(L, C, H) {
		var lin = lch2lin(L, C, H), lo = 0, hi = C, i;
		if (!inGamut(lin)) {
			for (i = 0; i < 20; i++) {
				var mid = (lo + hi) / 2;
				lin = lch2lin(L, mid, H);
				if (inGamut(lin)) lo = mid; else hi = mid;
			}
			lin = lch2lin(L, lo, H);
		}
		return [clamp255(l2s(lin[0])), clamp255(l2s(lin[1])), clamp255(l2s(lin[2]))];
	}
	function inGamut(lin) {
		for (var i = 0; i < 3; i++) if (lin[i] < -0.0005 || lin[i] > 1.0005) return false;
		return true;
	}
	function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
	function lum(rgb) { return 0.2126 * s2l(rgb[0]) + 0.7152 * s2l(rgb[1]) + 0.0722 * s2l(rgb[2]); }
	function contrast(a, b) {
		var x = lum(a), y = lum(b);
		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	}
	// Repair by shifting L only (fidelity: hue and chroma are the brand's)
	function ensureContrast(rgb, bgRgb, min, dir) {
		if (contrast(rgb, bgRgb) >= min) return rgb;
		var lch = rgb2lch(rgb);
		for (var L = lch[0]; L >= 2 && L <= 98; L += dir * 2) {
			var c = lch2rgb(L, lch[1], lch[2]);
			if (contrast(c, bgRgb) >= min) return c;
		}
		return rgb;
	}
	// hexagons' derive(), unchanged: same input, same colours as Hexagons.palette().
	function derive(brand, theme) {
		var arr = (typeof brand === 'string' ? [brand] : brand).map(function (x) {
			return rgb2lch(parseColor(x));
		});
		var chrom = [];
		for (var i = 0; i < arr.length; i++) if (arr[i][1] >= 12) chrom.push(arr[i]);
		var neutral = chrom.length === 0;
		var prim = neutral ? [50, 0, 0] : chrom[0];
		var acc = chrom.length > 1 ? chrom[1] : [0, prim[1], (prim[2] + 40) % 360];
		var hotH = (chrom.length > 2 ? chrom[2] : prim)[2];
		var C = prim[1], H = prim[2], light = theme === 'light';

		var bg = light
			? lch2rgb(97, neutral ? 0 : 3, H)
			: lch2rgb(6, Math.min(C * 0.2, 10), H);
		var halo = light
			? lch2rgb(92, Math.min(C * 0.2, 8), H)
			: lch2rgb(12, Math.min(C * 0.3, 15), H);
		var Ls = light ? [72, 52, 32] : [32, 58, 82];
		var dir = light ? -1 : 1;
		var stops = [
			ensureContrast(lch2rgb(Ls[0], C * 0.9, H), bg, 1.5, dir),
			ensureContrast(lch2rgb(Ls[1], C, H), bg, 2.5, dir),
			ensureContrast(lch2rgb(Ls[2], C * 0.55, H), bg, 5, dir)
		];
		var accent = ensureContrast(lch2rgb(light ? 45 : 70, acc[1], acc[2]), bg, 3, dir);
		var hot = ensureContrast(
			lch2rgb(light ? 28 : 92, neutral ? 0 : (light ? 24 : 12), hotH), bg, 7, dir);

		return { colors: stops, accent: accent, hot: hot, background: bg, halo: halo };
	}

	// Roulette colours from the brand (spec: Colour, ADR 011). Every chromatic brand colour and
	// every role whose window it falls in make a pair; the nearest pairs are settled first, each
	// colour and each role once — so a colour goes to the role nearest its hue, not to the first
	// role that would have it. A role nobody took gets its classic hue in the brand's key; black is
	// always derived. The first colour left over is the body, the second the bowl. A grey brand
	// colour is the body when no chromatic one is left; otherwise it is chrome if no colour took the
	// brass, else the bowl if that is still free. With neither, the body is the brand's hue as wood.

	// ── colour: the four-colour deck (ADR 006) ────────────────────────────

	// roulette's capture, with four windows instead of three: every chromatic brand colour takes
	// the suit nearest its hue, nearest pairs settle first, each colour and each role at most
	// once. Three roles are never a brand colour — a deck has one black suit, a face is paper,
	// and the rules are a lighter ink than the pip beside them.
	function roles(brand, theme) {
		var list = brand == null ? DEFAULT_BRAND : typeof brand === 'string' ? [brand] : brand;
		var chrom = [], grey = null, pairs = [], got = [], used = [], free = [], i, r;
		var ROLE = [[28, 40], [265, 50], [145, 40], [85, 25]]; // heart, diamond, club, gilt
		for (i = 0; i < list.length; i++) {
			var c = rgb2lch(parseColor(list[i]));
			if (c[1] >= 12) chrom.push({ lch: c, hex: list[i] });
			else if (!grey) grey = list[i];
		}
		for (i = 0; i < chrom.length; i++) {
			for (r = 0; r < 4; r++) {
				var d = Math.abs(chrom[i].lch[2] - ROLE[r][0]) % 360;
				d = Math.min(d, 360 - d);
				if (d <= ROLE[r][1]) pairs.push([d, i, r]);
			}
		}
		// ties broken by colour then role, so the order never depends on the engine's sort
		pairs.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; });
		for (i = 0; i < pairs.length; i++) {
			if (!got[pairs[i][2]] && !used[pairs[i][1]]) { got[pairs[i][2]] = chrom[pairs[i][1]].lch; used[pairs[i][1]] = 1; }
		}
		for (i = 0; i < chrom.length; i++) if (!used[i]) free.push(chrom[i]);
		var heart = got[0], diamond = got[1], club = got[2], gold = got[3];
		var key = free[0] ? free[0].lch : grey || !chrom.length ? [50, 0, 0] : chrom[0].lch;
		var dk = theme === 'light' ? 'light' : 'dark';
		// the back may reuse a captured hue: the default triad captures all three, so this
		// fallback is the common path, not the rare one (ADR 006)
		var p = derive(free[0] ? free[0].hex : grey || (chrom.length ? chrom[0].hex : list), dk);
		var chrome = grey && free[0] && !gold;
		var bC = key[1], bH = key[2];
		var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
		// An unclaimed suit leans toward the brand by at most 15 degrees along the shorter arc.
		// One or two brand colours capture one or two suits, so without this the brand reached the
		// back and almost nothing else (M1). The classic centres are 117 degrees apart at worst, so
		// no shift can make two suits collide; an achromatic brand has no hue to lean toward.
		var tint = function (hue) {
			if (bC < 12) return hue;
			var d = ((bH - hue + 540) % 360) - 180;
			return (hue + clamp(d, -15, 15) + 360) % 360;
		};
		var stock = lch2rgb(96.5, Math.min(bC * 0.08, 4), bH);
		var ink = ensureContrast(lch2rgb(34, Math.min(bC * 0.25, 10), bH), stock, 3, -1);
		var suit = function (c, L, fallbackC, lo, hi, hue) {
			return ensureContrast(c ? lch2rgb(L, c[1], c[2]) : lch2rgb(L, clamp(fallbackC, lo, hi), tint(hue)), stock, 3, -1);
		};
		return {
			heart: suit(heart, 46, bC * 1.2, 50, 75, 28),
			diamond: suit(diamond, 48, bC * 1.1, 45, 70, 265),
			club: suit(club, 45, bC, 35, 60, 145),
			spade: ensureContrast(lch2rgb(14, Math.min(bC * 0.15, 6), bH), stock, 7, -1),
			gilt: ensureContrast(lch2rgb(58, gold ? gold[1] * 0.8 : bC && !chrome ? 35 : 0, gold ? gold[2] : 85), stock, 2, -1),
			stock: stock, ink: ink,
			back: p.colors[0], panel: free[1] ? derive(free[1].hex, dk).colors[0] : p.colors[0],
			stroke: p.colors, background: p.background, halo: p.halo
		};
	}

	function palette(brand, opts) {
		var r = roles(brand, opts && opts.theme), out = {};
		for (var k in r) out[k] = k === 'stroke' ? r[k].map(toHex) : toHex(r[k]);
		return out;
	}

	// seeded ids: [a-z][a-z0-9]{5}, never repeated within one picture (ADR 005)
	function tokens(S, salt) {
		var r = S('ids' + (salt || '')), used = {}, AZ = 'abcdefghijklmnopqrstuvwxyz', AZ09 = AZ + '0123456789';
		return function () {
			var tk;
			do {
				tk = AZ.charAt(Math.floor(r() * 26));
				for (var i = 0; i < 5; i++) tk += AZ09.charAt(Math.floor(r() * 36));
			} while (used[tk]);
			used[tk] = 1;
			return tk;
		};
	}

	// ── the alphabet: 13 rank skeletons and 4 suit pips (ADR 005) ───────────

	// Rank glyphs are STROKED skeletons on a 64×96 em (x ±32, y ±48), control points on an 8-unit
	// lattice, command set M L H V Q only — 234 B against 1003 B for filled outlines, and a filled
	// outline could not take a `weight` at all. Order: A 2 3 4 5 6 7 8 9 10 J Q K.
	var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
	var G = [
		'M-24 48 0-48 24 48M-13 15H13',
		'M-21 -30Q-21 -48 0-48 21-48 21-30 21-12 3 4-21 26-21 48H21',
		'M-20 -36Q-14 -48 1-48 22-48 22-30 22-12 2-10 22-8 22 12 22 48 0 48-17 48-23 36',
		'M9 48V-48L-23 16H25',
		'M19 -46H-15L-19 -8Q-7 -16 3-16 23-16 23 14 23 48 1 48-16 48-22 36',
		'M16 -38Q0 -48-12 -34-20 -20-20 4V10Q-20 34 0 34 20 34 20 12 20-8 0-8-14 -8-20 10',
		'M-21 -46H21L-5 48',
		'M0 -48Q-19 -48-19 -33-19 -19 0-10 19-1 19 16 19 48 0 48-19 48-19 16-19 -1 0-10 19-19 19-33 19-48 0-48z',
		'M-16 38Q0 48 12 34 20 20 20-4V-10Q20 -34 0-34-20 -34-20 -12-20 8 0 8 14 8 20-10',
		'M-40 -38-31 -46V48M2 -46Q22 -46 22 1 22 48 2 48-18 48-18 1-18 -46 2-46z',
		'M13 -46V20Q13 46-8 46-25 46-25 25',
		'M0 -46Q23 -46 23 1 23 48 0 48-23 48-23 1-23 -46 0-46zM5 22 25 48',
		'M-21 -46V48M15 -46-21 3M-5 -12 19 48'
	];

	// Suit pips are FILLED (or stroked in line style), authored on a 72×80 box: x ±36, y ±40.
	// All four are traditional glyphs the user supplied, retargeted from the 76×76
	// top-left box they were drawn in: every number scaled by 1.55, absolute commands offset too
	// (the spade carries an absolute H — moving only the opening M stretches it instead of
	// translating it), then rounded to whole units, which is this library's own precision. Checked
	// with getBBox() in Chromium: heart 62×69, diamond 58×72, club 62×70, spade 58×73 — one set,
	// drawn to one scale. One decimal was measured too and is NOT usable: it collapses the club to
	// 43 units tall, because rounding a long chain of relative deltas drifts.
	var SUITS = 'hdcs';
	var PIP = [
		'M31-18q0 18-21 42l-10 11-11-11Q-31-1-31-18q0-7 5-12 4-4 12-4 7 0 11 4 3 3 3 6 1-3 3-5 5-4 11-4 8 0 12 4 5 5 5 12',
		'M0 36-29 0l29-36 29 36z',
		'M4 21q0 4 2 14h-12q2-9 2-14l1-10q0-1 1 0-2 4-4 7-4 5-11 5-6 0-10-4-4-5-4-11 0-7 4-12 4-4 10-4 6 0 10 4 1-1 0-2-7-5-7-15 0-6 4-10 4-4 10-4 7 0 11 4 4 5 4 11 0 9-7 14-1 1-1 2 5-4 10-4 6 0 10 4 4 5 4 12 0 6-4 11-4 4-10 4-6 0-11-5-2-3-4-7 1-1 1 0z',
		'M5 23q0 6 2 13H-6q2-8 2-13l0-9q1-1 2 0-2 4-5 6-3 3-10 3-5 0-8-3-4-4-4-11 0-8 15-28l14-18 14 18q15 19 15 28 0 7-4 11-3 3-8 3-6 0-10-4-4-4-4-6 1 0 1 0z'
	];

	// The pip field, packed (ADR 004). Two nibbles per rank: `sym` slots live in the mirrored half
	// and so appear twice, `solo` slots are drawn once and upright. The 7's odd pip is the T1 bit —
	// one bit of data, not a branch.
	//   sym : S0 pair(±100,−206) S1 centre(0,−206) S2 pair(±100,−69) S3 centre(0,−103)
	//   solo: T0 centre(0,0)     T1 centre(0,−103) T2 ace scale      T3 pair(±100,0)
	var LAY = [
		[0, 5], [2, 0], [2, 1], [1, 0], [1, 1], [1, 8], [1, 10], [9, 8], [5, 1], [13, 0]
	];
	var COL = 100, ROW = [206, 103, 69];

	// ── the back: the family's own lattices (ADR 008) ───────────────────────

	// The three `d` builders are the siblings' own, copied with their seam and cap comments —
	// both were earned by defects, and re-deriving them would re-earn them. Only the <svg>
	// wrapper and the data-URI return are dropped; the tile goes inside a <pattern> instead.
	// Sources: trigons-lite.js:427, octagons.js:463, hexagons.js:870.
	function lattice(kind, p2, flat) {
		var d = [];
		var q = function (v) { return Math.round(v * 1000) / 1000; };
		var seg = function (x1, y1, x2, y2) {
			// flat orientation is the same tile with x and y swapped (hexagons')
			d.push(flat ? 'M' + q(y1) + ' ' + q(x1) + 'L' + q(y2) + ' ' + q(x2)
				: 'M' + q(x1) + ' ' + q(y1) + 'L' + q(x2) + ' ' + q(y2));
		};
		if (kind === 'trigon') {
			// border segments sit on both opposite edges so the half-clipped strokes of
			// neighbouring tiles sum to full weight; butt caps keep the vertices sharp
			// (round caps would blob them)
			seg(0, 0, p2, 0); seg(0, p2, p2, p2);
			seg(0, 0, 0, p2); seg(p2, 0, p2, p2);
			seg(p2, 0, 0, p2);
		} else if (kind === 'octagon') {
			var a = A_REG * p2;
			// Flats sit exactly on the tile edge, so a stroke there is half-clipped.
			// Drawing each on BOTH opposite edges lets the neighbouring tile supply the
			// missing half — otherwise every seam renders at half thickness.
			seg(a, 0, p2 - a, 0); seg(a, p2, p2 - a, p2);
			seg(0, a, 0, p2 - a); seg(p2, a, p2, p2 - a);
			seg(p2 - a, 0, p2, a); seg(p2, p2 - a, p2 - a, p2);
			seg(a, p2, 0, p2 - a); seg(0, a, a, 0);
		} else {
			var sz = p2 / SQRT3;
			var cell = function (cx, cy, r) {
				var w2 = SQRT3 / 2 * r;
				var v = [[cx, cy - r], [cx + w2, cy - r / 2], [cx + w2, cy + r / 2],
					[cx, cy + r], [cx - w2, cy + r / 2], [cx - w2, cy - r / 2]];
				for (var k = 0; k < 6; k++) seg(v[k][0], v[k][1], v[(k + 1) % 6][0], v[(k + 1) % 6][1]);
			};
			// centre cell outline; its left and right walls sit exactly on the tile edge, so both
			// are drawn — the neighbouring tile supplies the other half of the stroke (same seam
			// rule as the octagons pattern)
			cell(p2 / 2, sz, sz);
			// the one wall not on the centre cell: between the two half-cells
			seg(p2 / 2, 2 * sz, p2 / 2, 3 * sz);
		}
		return d.join('');
	}
	var KINDS = ['trigon', 'octagon', 'hex'];

	// The back carries NO fixed `d`: the pitch rebuilds every number in the tile, so it is the
	// proof that the 17 fixed paths of ADR 005 are a scope and not an excuse.
	function back(c) {
		var o = c.o, S = c.S, p = c.p, stock = c.col('stock');
		// the face is paper in both themes, so the "large flat colour fights a white page" lesson
		// lands here and nowhere else: under theme light the back defaults to line (ADR 011)
		var flat = o.style ? o.style !== 'line' : o.theme !== 'light';
		var kind = o.lattice && o.lattice !== 'auto' ? o.lattice : KINDS[Math.floor(S('back:lattice')() * 3)];
		var rx = n(24 + 12 * S('card:rx:back')(), p);
		var b = 20 + 12 * S('back:inset')();
		var field = o.face === false ? '' : el('rect', ['x', -HW, 'y', -HH, 'width', W, 'height', H, 'rx', rx,
			'fill', flat ? c.col('back') : 'none', 'stroke', flat ? null : c.col('back'), 'stroke-width', flat ? null : 3]);
		// the rounded rect IS the clip: a pattern fill is clipped by the shape it fills, so the
		// frame inset is structural — it keeps the lattice off the card's own corner (ADR 008)
		var fr = ['x', n(-HW + b, p), 'y', n(-HH + b, p), 'width', n(W - 2 * b, p), 'height', n(H - 2 * b, p),
			'rx', n(Math.max(rx - 0.8 * b, 0), p), 'stroke', stock, 'stroke-width', n(6 * c.w, 2)];
		if (kind === 'none' || o.detail === 1) return field + el('rect', fr.concat(['fill', 'none']));

		var pitch = 26 + 30 * S('back:pitch')();
		var flatHex = kind === 'hex' && S('back:orient')() < 0.5;
		// a hexagon tile is pitch by 3s, and the flat orientation swaps the two
		var tall = kind === 'hex' ? 3 * (pitch / SQRT3) : pitch;
		// one pattern serves every back in a picture: they are the same seeded tile
		var pid = c.add('back', function () {
			return el('pattern', ['id', '%', 'patternUnits', 'userSpaceOnUse',
				'width', n(flatHex ? tall : pitch, 2), 'height', n(flatHex ? pitch : tall, 2),
				'patternTransform', 'translate(' + n(pitch * S('back:phase')(), 2) + ' ' +
					n(pitch * S('back:phase2')(), 2) + ') rotate(' + n(90 * S('back:turn')(), 2) + ')'],
			// butt caps (the SVG default, so never set): every edge is its own subpath, and round
			// caps blunt the vertices — at a small pitch they turn the octagons into circles.
			// Carried from hexagons.js:918 and octagons.js:508 with the geometry (ADR 008).
			el('path', ['d', lattice(kind, pitch, flatHex), 'fill', 'none', 'stroke', stock,
				'stroke-width', n((1 + 1.4 * S('back:weight')()) * c.w, 2),
				'stroke-opacity', n(0.14 + 0.12 * S('back:op')(), 2)]));
		});
		return field + el('rect', fr.concat(['fill', 'url(#' + pid + ')']));
	}

	// ── the court emblem (ADR 012) ──────────────────────────────────────────

	// A geometric rosette, not a figure: a count reads where a drawing does not at hero scale, and
	// the corner index carries the rank anyway. Rank IS the ring count — J 1, Q 2, K 3 — and every
	// seeded count is even, or the panel's 180° symmetry claim breaks.
	function court(ri, si, c) {
		var S = c.S, p = c.p, key = RANKS[ri] + SUITS.charAt(si);
		var rings = ri - 9; // J 1, Q 2, K 3
		var segs = 6 + 2 * Math.floor(S('court:segs:' + key)() * 4);
		var spokes = 4 + 2 * Math.floor(S('court:spokes:' + key)() * 3);
		var phase = S('court:phase:' + key)() * 360 / segs;
		var gilt = c.col('gilt'), g = '';
		var pr = n(12 + 8 * S('court:rx:' + key)(), p);
		g += el('rect', ['x', -130, 'y', -236, 'width', 260, 'height', 472, 'rx', pr,
			'fill', c.flat ? c.col('stock') : 'none', 'stroke', gilt, 'stroke-width', n(5 * c.w, 2)]);
		var R0 = [112, 86, 58], dashOuter = S('court:dash:' + key)() < 0.5;
		for (var k = 0; k < rings; k++) {
			var rr = R0[k], dash = 2 * Math.PI * rr / segs;
			g += el('circle', ['r', n(rr, p), 'fill', 'none', 'stroke', gilt, 'stroke-width', n(7 * c.w, 2),
				'stroke-dasharray', (k === 0 ? dashOuter : k % 2) ? n(dash / 2, 2) + ' ' + n(dash / 2, 2) : null,
				'transform', 'rotate(' + n(phase, 2) + ')']);
		}
		var sp = '', si0 = n(24 + 14 * S('court:spoke0:' + key)(), p), so0 = n(100 + 12 * S('court:spoke1:' + key)(), p);
		for (var j = 0; j < spokes; j++) {
			sp += el('path', ['d', 'M0 -' + si0 + ' 0-' + so0,
				'transform', 'rotate(' + n(phase + j * 360 / spokes, 2) + ')',
				'fill', 'none', 'stroke', gilt, 'stroke-width', n(4 * c.w, 2)]);
		}
		return g + sp;
	}

	// ── the face ────────────────────────────────────────────────────────────

	// A card body at card-local origin, plus the defs it needs. A spread composes these by
	// transform and shares one defs block, so a rank glyph and a suit pip are emitted once per
	// picture however many cards use them (spec: the seam).
	function face(ri, si, c, down) {
		if (down) return back(c);
		var o = c.o, add = c.add, suit = c.col(['heart', 'diamond', 'club', 'spade'][si]);
		var w = c.w, p = c.p, flat = c.flat;
		// the glyph def carries no colour: the <use> does, so one rank serves all four suits and a
		// 52-card sheet holds 17 paths, not 56 (spec: deck())
		var gid = add('g' + ri, function () {
			return el('path', ['id', '%', 'd', G[ri], 'fill', 'none',
				'stroke-width', n(Math.min(12 * w, 20), 2), 'stroke-linecap', 'round', 'stroke-linejoin', 'round']);
		});
		var pid = add('p' + si, function () {
			return el('path', ['id', '%', 'd', PIP[si], 'fill', flat ? suit : 'none',
				'stroke', flat ? null : suit, 'stroke-width', flat ? null : n(4 * w, 2)]);
		});
		var use = function (x, y) { return el('use', ['href', '#' + pid, 'x', n(x, p), 'y', n(y, p)]); };

		// the index block: the rank, and under it a mini pip that is always filled — an outline
		// at this size fills in and vanishes (ADR 011)
		var idx = o.index === 'none' ? '' : el('g', ['transform', 'translate(-184 -258)'],
			el('use', ['href', '#' + gid, 'stroke', suit])) +
			el('g', ['transform', 'translate(-184 -172) scale(0.78)'], el('path', ['d', PIP[si], 'fill', suit]));
		// the index rides the mirror, which is where the bottom-right one comes from for free;
		// 'tl' wants one corner only, so it is drawn outside the mirrored group instead
		var half = o.index === 'tl' ? '' : idx, solo = '';

		var lay = ri < 10 ? LAY[ri] : null;
		if (o.pips !== false && lay) {
			var sym = lay[0], so = lay[1];
			if (sym & 1) half += use(-COL, -ROW[0]) + use(COL, -ROW[0]);
			if (sym & 2) half += use(0, -ROW[0]);
			if (sym & 4) half += use(-COL, -ROW[2]) + use(COL, -ROW[2]);
			if (sym & 8) half += use(0, -ROW[1]);
			// T2 is a scale flag on the centre pip, not a pip of its own — that is the ace
			if (so & 1) solo += so & 4 ? el('g', ['transform', 'scale(1.9)'], el('use', ['href', '#' + pid])) : use(0, 0);
			if (so & 2) solo += use(0, -ROW[1]);
			if (so & 8) solo += use(-COL, 0) + use(COL, 0);
		}
		// a court card carries its rosette, with the suit pip at the middle of it; `emblem: false`
		// leaves the centre to a large pip instead (ADR 012)
		if (ri >= 10) {
			solo += o.emblem === false ? el('g', ['transform', 'scale(2.4)'], el('use', ['href', '#' + pid]))
				: court(ri, si, c) + el('g', ['transform', 'scale(1.6)'], el('use', ['href', '#' + pid]));
		}

		var hid = c.tk();
		c.defs += el('g', ['id', hid], half);
		var rx = n(24 + 12 * c.S('card:rx:' + RANKS[ri] + SUITS.charAt(si))(), p);
		var body = o.face === false ? '' : el('rect', ['x', -HW, 'y', -HH, 'width', W, 'height', H, 'rx', rx, 'fill', c.col('stock')]);
		body += el('rect', ['x', n(-HW + 1.5, p), 'y', n(-HH + 1.5, p), 'width', n(W - 3, p), 'height', n(H - 3, p),
			'rx', n(Math.max(rx - 1.5, 0), p), 'fill', 'none', 'stroke', c.col('ink'), 'stroke-width', n(3 * w, 2)]);
		body += el('use', ['href', '#' + hid]) + el('use', ['href', '#' + hid, 'transform', 'rotate(180)']);
		if (o.index === 'tl') body += idx;
		return body + solo;
	}

	// the shared context: options, streams, roles, the token generator and a defs cache keyed by
	// what the markup is, so one glyph and one pip serve every card in a picture
	function context(o) {
		var S = streams(o.seed == null ? 1 : o.seed), r = roles(o.brand, o.theme), seen = {};
		var c = {
			o: o, S: S, r: r, defs: '',
			p: o.precision == null ? 0 : o.precision,
			w: o.weight == null ? 1 : o.weight,
			flat: o.style !== 'line',
			col: function (role) {
				var pin = o[role];
				return pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);
			}
		};
		// Ids are keyed by WHAT IS DRAWN, not only by the seed: two different cards, or two
		// different hands, under one seed on one page would otherwise share ids and every <use>
		// would resolve to the first of them. salt remains for what that cannot fix — the same
		// picture twice.
		c.ids = function (key) {
			c.key = key;
			c.tk = tokens(S, (o.salt || '') + key);
			c.add = function (k, make) {
				if (!seen[k]) { var id = c.tk(); seen[k] = id; c.defs += make().replace('"%"', '"' + id + '"'); }
				return seen[k];
			};
		};
		return c;
	}

	// rank and suit: `card` sets both at once, then the separate options, then the seed
	function pick(o, S, key) {
		var code = typeof o.card === 'string' ? o.card.toUpperCase() : '';
		var ri = code ? RANKS.indexOf(code.length > 2 ? code.slice(0, 2) : code.charAt(0)) : -1;
		var si = code ? SUITS.indexOf(code.charAt(code.length - 1).toLowerCase()) : -1;
		if (o.rank != null && o.rank !== 'auto') ri = typeof o.rank === 'number' ? o.rank : RANKS.indexOf(String(o.rank).toUpperCase());
		if (o.suit != null && o.suit !== 'auto') si = SUITS.indexOf(String(o.suit).charAt(0).toLowerCase());
		if (ri < 0) ri = Math.floor(S('card:rank' + key)() * 13);
		if (si < 0) si = Math.floor(S('card:suit' + key)() * 4);
		return [ri, si];
	}

	function wrap(o, c, box, inner, style) {
		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		var vb = box.map(function (v) { return n(v, c.p); }).join(' ');
		return el('svg', ['xmlns', NS, 'viewBox', vb, 'width', o.size == null ? null : n(o.size),
			'height', o.size == null ? null : n(o.size * box[3] / box[2])].concat(a11y),
		(c.defs ? el('defs', [], c.defs) : '') + (style || '') + inner);
	}

	function card(opts) {
		var o = opts || {}, c = context(o), rs = pick(o, c.S, '');
		c.ids(RANKS[rs[0]] + SUITS.charAt(rs[1]));
		// one card is a hand of one, so it reads the same facedown vocabulary: passing the
		// documented default `'none'` must not turn the card over, and a truthy string did
		var body = face(rs[0], rs[1], c, downAt(o, 0, 1));
		return wrap(o, c, [-HW, -HH, W, H], body);
	}


	// ── spreads: every layout returns (cx, cy, a) triples and nothing else ──

	// The fan's seeded quantity is the REVEAL — the fraction of a card left visible — because that
	// is what the eye reads and what IDX constrains; the angular step is derived from it. Anchored
	// at card 0 rather than centred, so raising `count` appends instead of re-dealing; frame()
	// recentres the picture, so anchoring costs nothing visually (ADR 007).
	function fan(n0, S, o) {
		var Rp = (o.arc == null || o.arc === 'auto' ? 1.6 + S('spread:fan:arc')() : o.arc) * H;
		var rev = o.reveal == null || o.reveal === 'auto'
			? Math.max(0.34 + 0.28 * S('spread:fan:reveal')(), IDX / W)
			: o.reveal;
		var lean = o.lean == null || o.lean === 'auto' ? -10 + 20 * S('spread:fan:lean')() : o.lean;
		var step = o.step == null || o.step === 'auto' ? Math.atan2(rev * W, Rp) / DEG : o.step;
		var out = [], i;
		for (i = 0; i < n0; i++) {
			var a = lean + i * step, t = a * DEG;
			out.push([Rp * Math.sin(t) + jit(S, o, i, 6), Rp * (1 - Math.cos(t)) + jit(S, o, i, 6), a + jit(S, o, i, 1)]);
		}
		return out;
	}

	// A row overlaps left to right with the ends lifted a little; the tilt alternates, because a
	// hand laid on a table is never square.
	function row(n0, S, o) {
		var rev = o.reveal == null || o.reveal === 'auto'
			? Math.max(0.32 + 0.30 * S('spread:row:reveal')(), IDX / W)
			: o.reveal;
		var rise = 0.05 * H * S('spread:row:rise')(), tilt = 3 * S('spread:row:tilt')();
		// the parabola belongs to the row, not to this hand: anchored at a fixed span, so card i
		// is a pure function of i and raising count appends instead of re-dealing (spec)
		var out = [], i, mid = (CAP.row - 1) / 2;
		for (i = 0; i < n0; i++) {
			var u = (i - mid) / mid;
			out.push([i * rev * W + jit(S, o, i, 5), rise * u * u + jit(S, o, i, 5), (i % 2 ? -1 : 1) * tilt + jit(S, o, i, 0.8)]);
		}
		return out;
	}

	// The per-card wobble, keyed by index so raising count never re-rolls a card already placed.
	// jitter 0 is machine-neat; it scales every layout's own idea of a wobble.
	function jit(S, o, i, amp) {
		return (o.jitter == null ? 1 : o.jitter) * amp * (S('spread:jitter:' + i)() - 0.5);
	}

	// A stack is the folded hand: a small per-card lift along a seeded direction, a little skew,
	// and a few cards breaking rank. Indices below the top card are hidden by nature — that is
	// the motif, and it is why `stack` is exempt from the index clearance rule (ADR 007).
	function stack(n0, S, o) {
		var lift = 2 + 3 * S('spread:stack:lift')(), skew = -0.35 + 0.7 * S('spread:stack:skew')();
		var dir = (100 + 40 * S('spread:stack:dir')()) * DEG;
		var mess = Math.floor(S('spread:stack:mess')() * 4);
		var out = [], i;
		for (i = 0; i < n0; i++) {
			var off = i < mess ? (0.05 + 0.07 * S('spread:stack:off:' + i)()) * W : 0;
			out.push([i * lift * Math.cos(dir) + off + jit(S, o, i, 6), i * lift * Math.sin(dir) + jit(S, o, i, 6), i * skew + jit(S, o, i, 1)]);
		}
		return out;
	}

	// One behind another, the solitaire column. This is the layout where the index binds: dx may
	// never fall below IDX, or the rank of every covered card disappears.
	function cascade(n0, S, o) {
		var dx = o.reveal == null || o.reveal === 'auto'
			? Math.max((0.28 + 0.14 * S('spread:cascade:dx')()) * W, IDX)
			: Math.max(o.reveal * W, 0);
		var dy = (0.14 + 0.12 * S('spread:cascade:dy')()) * H;
		var tilt = 2.5 * S('spread:cascade:tilt')();
		var out = [], i;
		for (i = 0; i < n0; i++) out.push([i * dx, i * dy, i * tilt]);
		return out;
	}

	// A heap. Indices are not guaranteed here and the spec says so — that is what a pile is.
	// The fourth element is the paint order: a heap is not dealt in sequence. It is a pure
	// function of the card's own index, so a seventh card slots into the order without moving
	// the six already there, and painting never learns which layout produced it (ADR 007).
	function pile(n0, S, o) {
		var sc = (0.10 + 0.25 * S('spread:pile:scatter')()) * W;
		var spin = 18 + 22 * S('spread:pile:spin')();
		var out = [], i;
		for (i = 0; i < n0; i++) {
			var a = S('spread:pile:a:' + i)() * 2 * Math.PI, r = Math.sqrt(S('spread:pile:r:' + i)()) * sc;
			out.push([r * Math.cos(a), r * Math.sin(a), -spin + 2 * spin * S('spread:pile:t:' + i)() + jit(S, o, i, 6),
				S('spread:pile:z:' + i)()]);
		}
		return out;
	}

	// The blackjack motif: two cards, and a crosswise third for a double-down.
	function pair(n0, S, o) {
		var ang = 10 + 16 * S('spread:pair:angle')();
		var ox = (0.38 + 0.14 * S('spread:pair:offset')()) * W, oy = (-0.02 + 0.08 * S('spread:pair:oy')()) * H;
		var out = [[0, 0, 0]], i;
		for (i = 1; i < n0; i++) {
			out.push(i === 1 ? [ox, oy, ang + jit(S, o, i, 2)]
				: [(0.24 + 0.04 * i) * W, 0.46 * H, 84 + 12 * S('spread:pair:cross')() + jit(S, o, i, 2)]);
		}
		return out;
	}

	var LAYOUTS = { fan: fan, row: row, stack: stack, cascade: cascade, pile: pile, pair: pair };
	var CAP = { fan: 10, row: 7, stack: 8, cascade: 13, pile: 12, pair: 3 };

	// `auto` picks by count and is opt-in, not the default: it swings the aspect from 0.9 to 2.3
	// under a seed change, which breaks a page's reserved box (spec: Spreads).
	function choose(n0, S) {
		if (n0 <= 1) return 'fan';
		if (n0 === 2) return 'pair';
		var few = ['fan', 'row', 'cascade'], many = ['fan', 'cascade', 'pile'];
		if (n0 > 10) return 'stack';
		return (n0 <= 5 ? few : many)[Math.floor(S('spread:kind')() * 3)];
	}

	// A rectangle's support function is exact: w|cos a| + h|sin a| is its half-extent in x. The
	// corner radius only shrinks the shape, so the box is tight, and it is taken from the EMITTED
	// numbers, which makes "every corner is inside the viewBox" exactly true (ADR 007).
	function frame(place, o, p) {
		var b = [1e9, 1e9, -1e9, -1e9], i;
		for (i = 0; i < place.length; i++) {
			var t = place[i][2] * DEG, cs = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t));
			var ex = HW * cs + HH * sn, ey = HW * sn + HH * cs;
			b[0] = Math.min(b[0], place[i][0] - ex); b[1] = Math.min(b[1], place[i][1] - ey);
			b[2] = Math.max(b[2], place[i][0] + ex); b[3] = Math.max(b[3], place[i][1] + ey);
		}
		var pad = (o.pad == null ? 0.06 : o.pad) * W;
		b[0] -= pad; b[1] -= pad; b[2] += pad; b[3] += pad;
		var w0 = b[2] - b[0], h0 = b[3] - b[1];
		if (o.fit === 'square') {
			var d = Math.abs(w0 - h0) / 2;
			if (w0 < h0) { b[0] -= d; w0 = h0; } else { b[1] -= d; h0 = w0; }
		}
		return [n(b[0], p), n(b[1], p), n(w0, p), n(h0, p)];
	}

	// facedown: 'all' | 'first' | 'last' | a mask like '01101' | an array of indices
	function downAt(o, i, count) {
		var f = o.facedown;
		if (!f || f === 'none') return false;
		if (f === true || f === 'all') return true;
		if (f === 'first') return i === 0;
		if (f === 'last') return i === count - 1;
		if (typeof f === 'string') return f.charAt(i) === '1';
		return f.indexOf(i) >= 0;
	}

	// ── hands: the named presets are DATA, never an evaluator (ADR 010) ─────

	// A partial Fisher-Yates whose prefix is stable in m: draw i always reads stream key:i, so
	// asking for one more distinct value never re-rolls the ones already drawn.
	// a name from outside must never reach Object.prototype: `preset: 'toString'` found a function
	// where a layout was expected, and the house never throws
	function own(obj, k) {
		return Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null;
	}

	function pickN(S, key, m, N) {
		var a = [], out = [], i, j, t;
		for (i = 0; i < N; i++) a.push(i);
		for (i = 0; i < m; i++) {
			j = i + Math.floor(S(key + ':' + i)() * (N - i));
			t = a[i]; a[i] = a[j]; a[j] = t;
			out.push(a[i]);
		}
		return out;
	}

	// rank order for a run, the ace at both ends: s = 0 is the wheel, s = 9 the royal
	var RUN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0];
	var PRESET = {
		'royal-flush': 'row', 'straight-flush': 'row', 'four-of-a-kind': 'row', 'full-house': 'row',
		flush: 'row', straight: 'row', 'three-of-a-kind': 'row', 'two-pair': 'row',
		pair: 'fan', 'high-card': 'fan', blackjack: 'pair', 'double-down': 'pair'
	};
	var GROUPS = {
		'four-of-a-kind': [4, 1], 'full-house': [3, 2], 'three-of-a-kind': [3, 1, 1],
		'two-pair': [2, 2, 1], pair: [2, 1, 1, 1]
	};

	// Every category is correct BY CONSTRUCTION, which is what makes "no evaluator" literally
	// true: there is no isFlush() here, and nothing a reader could mistake for a scorer.
	function hands(name, S) {
		var cd = function (r, su) { return RANKS[r] + SUITS.charAt(su); };
		var out = [], i, j, suit = pickN(S, 'hand:suit', 1, 4)[0];

		// the blackjack motifs: an ace and a ten-value, and a crosswise third for a double-down
		if (name === 'blackjack' || name === 'double-down') {
			out = [cd(0, suit), cd(9 + pickN(S, 'hand:ten', 1, 4)[0], pickN(S, 'hand:suit2', 1, 4)[0])];
			// the third card must not be one of the two already on the table: drawing its rank and
			// its suit from streams that never saw them dealt the same physical card in 4.5% of
			// seeds — Ac 10s Ac, and the picture showed two identical cards side by side
			if (name === 'double-down') {
				for (i = 0; i < 52; i++) {
					var k = pickN(S, 'hand:third:' + i, 1, 52)[0], c3 = cd(k % 13, Math.floor(k / 13));
					if (out.indexOf(c3) < 0) { out.push(c3); break; }
				}
			}
			return out;
		}

		// a run of five. s = 9 IS the royal; a straight takes a second suit so it is not a flush
		if (name === 'royal-flush' || name === 'straight-flush' || name === 'straight') {
			var s0 = name === 'royal-flush' ? 9 : pickN(S, 'hand:run', 1, name === 'straight' ? 10 : 9)[0];
			for (i = 0; i < 5; i++) out.push(cd(RUN[s0 + i], suit));
			if (name === 'straight') {
				j = 1 + pickN(S, 'hand:odd', 1, 4)[0];
				out[j] = cd(RUN[s0 + j], (suit + 1 + pickN(S, 'hand:odd2', 1, 3)[0]) % 4);
			}
			return order(out);
		}

		// a run with an interior rank dropped and one taken from OUTSIDE the window: four ranks
		// spanning five positions with a hole, and a fifth that can neither fill it nor extend
		// the run. A high card is the same hand with one suit forced different.
		if (name === 'flush' || name === 'high-card') {
			var s1 = pickN(S, 'hand:run', 1, 10)[0], hole = 1 + pickN(S, 'hand:hole', 1, 3)[0];
			var used = [], keep = [], free = [];
			for (i = -1; i <= 5; i++) used[RUN[(s1 + i + 14) % 14]] = 1;
			for (i = 0; i < 5; i++) if (i !== hole) keep.push(RUN[s1 + i]);
			for (i = 0; i < 13; i++) if (!used[i]) free.push(i);
			keep.push(free[pickN(S, 'hand:odd', 1, free.length)[0]]);
			for (i = 0; i < 5; i++) out.push(cd(keep[i], suit));
			if (name === 'high-card') {
				j = 1 + pickN(S, 'hand:odd2', 1, 4)[0];
				out[j] = cd(keep[j], (suit + 1 + pickN(S, 'hand:odd3', 1, 3)[0]) % 4);
			}
			return order(out);
		}

		// the paired families. The ranks are distinct by the picker, so none of these can also be
		// a straight (which needs five distinct ranks) or a flush (a pair is two suits) — the
		// checks a scorer would need do not exist because they cannot fail.
		var g = own(GROUPS, name);
		if (!g) return null;
		var ranks = pickN(S, 'hand:rank', g.length, 13);
		for (i = 0; i < g.length; i++) {
			var suits = pickN(S, 'hand:suit:' + i, g[i], 4);
			for (j = 0; j < g[i]; j++) out.push(cd(ranks[i], suits[j]));
		}
		return order(out);
	}

	// Display order: the bigger group first, then high to low with the ace high. A comparator is
	// not an evaluator — it never decides what a hand IS, only which end of it to draw first.
	function order(codes) {
		var seen = {}, i;
		for (i = 0; i < codes.length; i++) {
			var r0 = codes[i].slice(0, -1);
			seen[r0] = (seen[r0] || 0) + 1;
		}
		return codes.slice().sort(function (a, b) {
			var ra = a.slice(0, -1), rb = b.slice(0, -1);
			var hi = function (r) { return r === 'A' ? 13 : RANKS.indexOf(r); };
			return seen[rb] - seen[ra] || hi(rb) - hi(ra);
		});
	}

	// ── the deal: CSS, one-shot, and it ends where the card belongs ─────────

	// SMIL cannot be gated by prefers-reduced-motion without script (ADR 006), so this is CSS.
	// The animation runs FROM an offset TO nothing: `animation: none` under reduced motion leaves
	// every card in its finished place, where a `to`-based deal would strand the reader looking
	// at the start state. Travel begins inside the frame, so nothing is clipped. The placement
	// transform stays on the outer group and the animation class on an inner one, because a CSS
	// transform would otherwise replace the attribute.
	function deal(c, count) {
		var S = c.S, speed = c.o.speed == null ? 1 : c.o.speed;
		if (!speed) return null;
		// motion names come from a stream of their own, so switching the deal on renames nothing
		// in the static picture — the family's rule, and a test pins it
		// keyed by the picture as well, the way ids are: two different hands under one seed on one
		// page shared a keyframe and their classes, and the document-global <style> let the later
		// block's timing win for both
		var tk = tokens(S, 'motion' + (c.o.salt || '') + c.key), kf = tk(), out = [], css = '', i;
		var dur = 0.45 / speed, step = 0.11 / speed;
		// the cards come from where the deck would be: up and to the left, inside the picture.
		// The whole start state must fit inside the pad, or the leading card of every spread
		// begins outside the viewBox and is clipped on its way in — at 0.70 opacity, which reads
		// as a glitch rather than as an entry.
		//
		// The slide was tied to `pad` at M4 and the note here then claimed the invariant held by
		// construction. It did not: the TURN was tied to nothing. At 12-28 degrees it put card 0
		// of every spread 111-128 units outside the box at t=0, measured in three engines, because
		// CSS rotates an SVG element about the VIEW BOX centre by default — so the swing grew
		// with the card's distance from the middle of the picture, and the widest hands were
		// worst. `transform-box:fill-box` below moves the pivot to the card's own centre, which
		// makes the reach a function of the card alone, and the angle is then derived from the
		// room left over rather than chosen. The divisor is the card's HALF-DIAGONAL, not H/2:
		// the card is already turned by its placement angle, and turning it further from there
		// grows the box fastest when the diagonal is what swings — 430 units here against 350
		// lying flat. Taking the flat figure left `stack` 6 units out at its worst seed, which is
		// how this number was found.
		//
		// And the start state spends only 85% of the pad, not all of it: the viewBox is rounded
		// to whole units, so the slack a picture really has is 29 where the pad says 30. Spending
		// the pad exactly left 3 units hanging out of `stack`. A quarter goes to the slide, three
		// fifths to the turn, and the remainder is the rounding's.
		var pad = (c.o.pad == null ? 0.06 : c.o.pad) * W;
		var fx = -0.25 * pad, fy = -0.25 * pad;
		var spin = -Math.asin(0.6 * pad / (Math.sqrt(W * W + H * H) / 2)) / DEG *
			(0.6 + 0.4 * S('deal:spin')());
		css = '@keyframes ' + kf + '{from{transform:translate(' + n(fx) + 'px,' + n(fy) +
			'px) rotate(' + n(spin, 1) + 'deg);opacity:0}}';
		for (i = 0; i < count; i++) {
			var cls = tk();
			out.push(cls);
			// transform-box, so the turn pivots on the card and not on the middle of the picture.
			// It is a property, not a transform attribute, so the rule that the animated element
			// carries no `transform` of its own still holds — and the test that pins it still passes.
			css += '.' + cls + '{transform-box:fill-box;animation:' + kf + ' ' + n(dur, 2) + 's ' +
				n(i * step, 2) + 's backwards cubic-bezier(.2,.7,.3,1)}';
		}
		css += '@media(prefers-reduced-motion:reduce){' +
			out.map(function (k) { return '.' + k; }).join(',') + '{animation:none}}';
		return { css: css, cls: out };
	}

	function hand(opts) {
		var o = opts || {}, c = context(o), i;
		// cards: an explicit list wins, otherwise distinct cards drawn from the seed
		var list = [];
		if (typeof o.cards === 'string') list = o.cards.split(/[\s,]+/);
		else if (o.cards) list = o.cards.slice();
		else if (o.preset) list = hands(o.preset, c.S) || [];
		var kind = o.spread && o.spread !== 'auto' && own(LAYOUTS, o.spread) ? o.spread : null;
		var want = list.length || (o.count == null ? 5 : o.count);
		// own() everywhere a name from outside indexes an object: `preset: 'toString'` reached
		// Object.prototype and threw, which breaks the promise that the house never throws
		if (!kind) kind = o.spread === 'auto' ? choose(want, c.S) : (o.preset && own(PRESET, o.preset)) || 'fan';
		// a count over the cap clamps silently; an explicit list never loses a card, the spread
		// gives way instead — a cascade holds 13, a stack holds any number (spec: Spreads)
		if (list.length > CAP[kind]) kind = list.length <= CAP.cascade ? 'cascade' : 'stack';
		var count = list.length || Math.max(1, Math.min(want, CAP[kind]));
		var codes = [], taken = {};
		for (i = 0; i < count; i++) {
			if (list.length) codes.push(list[i]);
			else {
				var k, guard = 0;
				do { k = Math.floor(c.S('hand:fill:' + i + ':' + guard)() * 52); guard++; } while (taken[k] && guard < 60);
				taken[k] = 1;
				codes.push(RANKS[k % 13] + SUITS.charAt(Math.floor(k / 13)));
			}
		}
		c.ids(codes.join('') + kind);
		var place = LAYOUTS[kind](count, c.S, o);
		// Round BEFORE framing, so the box is taken from the numbers the file actually carries:
		// that is what makes "every corner is inside the viewBox" exactly true rather than
		// true-to-a-rounding (ADR 007).
		for (i = 0; i < place.length; i++) {
			place[i][0] = +n(place[i][0], c.p); place[i][1] = +n(place[i][1], c.p); place[i][2] = +n(place[i][2], 2);
		}
		// paint order comes from the placement itself, never from the layout's name: a triple with
		// no fourth element paints in index order (ADR 007)
		var order = [], body = '';
		for (i = 0; i < count; i++) order.push(i);
		order.sort(function (a2, b2) {
			return (place[a2][3] == null ? a2 : place[a2][3]) - (place[b2][3] == null ? b2 : place[b2][3]);
		});
		var mo = o.motion ? deal(c, count) : null;
		for (var q = 0; q < count; q++) {
			i = order[q];
			var rs = pick({ card: codes[i] }, c.S, ':' + i);
			var drawn = face(rs[0], rs[1], c, downAt(o, i, count));
			// the class rides an INNER group: a CSS transform would replace the placement attribute
			if (mo) drawn = el('g', ['class', mo.cls[i]], drawn);
			body += el('g', ['transform', 'translate(' + place[i][0] + ' ' + place[i][1] + ')' +
				(place[i][2] ? ' rotate(' + place[i][2] + ')' : '')], drawn);
		}
		return wrap(o, c, frame(place, o, c.p), body, mo ? el('style', [], mo.css) : '');
	}

	// The whole deck as one sheet: 13 columns by 4 rows, one defs block, `detail: 1` by default.
	// This is its own output class and the spec says so — a hero hand is ~5 KB, a sheet is ~20.
	function deck(opts) {
		var o = opts || {}, c = context(o), i, j;
		var d2 = {};
		for (i in o) if (Object.prototype.hasOwnProperty.call(o, i)) d2[i] = o[i];
		if (d2.detail == null) d2.detail = 1;
		c.o = d2;
		c.ids('deck');
		var gap = 40, cw = W + gap, ch = H + gap, body = '';
		for (j = 0; j < 4; j++) {
			for (i = 0; i < 13; i++) {
				body += el('g', ['transform', 'translate(' + (gap + HW + i * cw) + ' ' + (gap + HH + j * ch) + ')'],
					face(i, j, c, o.facedown === true || o.facedown === 'all'));
			}
		}
		return wrap(d2, c, [0, 0, gap + 13 * cw, gap + 4 * ch], body);
	}

	// Browser convenience: draw into an element and keep it drawn. Pins stay pinned across set()
	// because options merge. Unlike roulette's, there is no loop and nothing to pause — a deal
	// plays once — so this is the insert-and-keep part only (ADR 002).
	function init(target, opts) {
		var host = typeof target === 'string' ? document.querySelector(target) : target;
		if (!host) return null;
		var cur = {}, draw = { card: card, hand: hand, deck: deck };
		var paint = function () { host.innerHTML = (own(draw, cur.draw) || hand)(cur); };
		var set = function (o) {
			for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) cur[k] = o[k];
			paint();
		};
		set(opts || {});
		return {
			el: host,
			get: function () { var c = {}; for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) c[k] = cur[k]; return c; },
			set: set,
			destroy: function () { host.innerHTML = ''; }
		};
	}

	return { card: card, hand: hand, deck: deck, palette: palette, init: init, RANKS: RANKS, SUITS: SUITS, IDX: IDX };
});
