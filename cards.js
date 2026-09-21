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
	var SUITS = 'hdcs';
	var PIP = [
		'M0 34C-22 14-33 2-33 -11-33 -24-23-32-11-32-4 -32 0-28 0-23 0-28 4-32 11-32 23-32 33-24 33-11 33 2 22 14 0 34z',
		'M0-38 29 0 0 38-29 0z',
		'M-4 6A13 13 0 1 1-15-8 13 13 0 1 1 0-24 13 13 0 1 1 15-8 13 13 0 1 1 4 6c1 13 5 22 11 30h-30c6-8 10-17 11-30z',
		'M0-36C10-21 33-9 33 6A15 15 0 0 1 4 12l4 24h-16l4-24A15 15 0 0 1-33 6C-33-9-10-21 0-36z'
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

	// ── the face ────────────────────────────────────────────────────────────

	// A card body at card-local origin, plus the defs it needs. A spread composes these by
	// transform and shares one defs block, so a rank glyph and a suit pip are emitted once per
	// picture however many cards use them (spec: the seam).
	function face(ri, si, c) {
		var o = c.o, add = c.add, suit = c.col(['heart', 'diamond', 'club', 'spade'][si]);
		var w = c.w, p = c.p, flat = c.flat;
		var gid = add('g' + ri + si, function () {
			return el('path', ['id', '%', 'd', G[ri], 'fill', 'none', 'stroke', suit,
				'stroke-width', n(Math.min(12 * w, 20), 2), 'stroke-linecap', 'round', 'stroke-linejoin', 'round']);
		});
		var pid = add('p' + si, function () {
			return el('path', ['id', '%', 'd', PIP[si], 'fill', flat ? suit : 'none',
				'stroke', flat ? null : suit, 'stroke-width', flat ? null : n(4 * w, 2)]);
		});
		var use = function (x, y) { return el('use', ['href', '#' + pid, 'x', n(x, p), 'y', n(y, p)]); };

		// the index block: the rank, and under it a mini pip that is always filled — an outline
		// at this size fills in and vanishes (ADR 011)
		var idx = o.index === 'none' ? '' : el('g', ['transform', 'translate(-184 -258)'], el('use', ['href', '#' + gid])) +
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
		// a court card carries a large centre pip until the emblem lands (M3, ADR 012)
		if (ri >= 10) solo += el('g', ['transform', 'scale(2.4)'], el('use', ['href', '#' + pid]));

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

	function wrap(o, c, box, inner) {
		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		var vb = box.map(function (v) { return n(v, c.p); }).join(' ');
		return el('svg', ['xmlns', NS, 'viewBox', vb, 'width', o.size == null ? null : n(o.size),
			'height', o.size == null ? null : n(o.size * box[3] / box[2])].concat(a11y),
		(c.defs ? el('defs', [], c.defs) : '') + inner);
	}

	function card(opts) {
		var o = opts || {}, c = context(o), rs = pick(o, c.S, '');
		c.ids(RANKS[rs[0]] + SUITS.charAt(rs[1]));
		var body = face(rs[0], rs[1], c);
		return wrap(o, c, [-HW, -HH, W, H], body);
	}

	var CAP = { fan: 10, row: 7 };

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
			out.push([Rp * Math.sin(t), Rp * (1 - Math.cos(t)), a]);
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
			out.push([i * rev * W, rise * u * u, (i % 2 ? -1 : 1) * tilt]);
		}
		return out;
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

	function hand(opts) {
		var o = opts || {}, c = context(o), i;
		// cards: an explicit list wins, otherwise distinct cards drawn from the seed
		var list = [];
		if (typeof o.cards === 'string') list = o.cards.split(/[\s,]+/);
		else if (o.cards) list = o.cards.slice();
		var kind = o.spread === 'row' ? 'row' : 'fan';
		var want = list.length || (o.count == null ? 5 : o.count);
		var count = Math.max(1, Math.min(want, CAP[kind]));
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
		c.ids(codes.join(''));
		var place = (kind === 'row' ? row : fan)(count, c.S, o);
		// Round BEFORE framing, so the box is taken from the numbers the file actually carries:
		// that is what makes "every corner is inside the viewBox" exactly true rather than
		// true-to-a-rounding (ADR 007).
		for (i = 0; i < place.length; i++) {
			place[i][0] = +n(place[i][0], c.p); place[i][1] = +n(place[i][1], c.p); place[i][2] = +n(place[i][2], 2);
		}
		var body = '';
		for (i = 0; i < count; i++) {
			var rs = pick({ card: codes[i] }, c.S, ':' + i);
			body += el('g', ['transform', 'translate(' + place[i][0] + ' ' + place[i][1] + ')' +
				(place[i][2] ? ' rotate(' + place[i][2] + ')' : '')], face(rs[0], rs[1], c));
		}
		return wrap(o, c, frame(place, o, c.p), body);
	}

	return { card: card, hand: hand, palette: palette, RANKS: RANKS, SUITS: SUITS, IDX: IDX };
});
