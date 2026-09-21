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
		var stock = lch2rgb(96.5, Math.min(bC * 0.08, 4), bH);
		var ink = ensureContrast(lch2rgb(34, Math.min(bC * 0.25, 10), bH), stock, 3, -1);
		var suit = function (c, L, fallbackC, lo, hi, hue) {
			return ensureContrast(c ? lch2rgb(L, c[1], c[2]) : lch2rgb(L, clamp(fallbackC, lo, hi), hue), stock, 3, -1);
		};
		return {
			heart: suit(heart, 46, bC * 1.2, 50, 75, 28),
			diamond: suit(diamond, 48, bC * 1.1, 45, 70, 265),
			club: suit(club, 45, bC, 35, 60, 145),
			spade: ensureContrast(lch2rgb(14, Math.min(bC * 0.15, 6), bH), stock, 7, -1),
			gilt: ensureContrast(lch2rgb(40, gold ? gold[1] * 0.8 : bC && !chrome ? 35 : 0, gold ? gold[2] : 85), stock, 2, -1),
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

	// ── drawing ───────────────────────────────────────────────

	// M0: the blank. Face, edge rule and the seeded corner radius — enough to prove the module
	// format, the palette port and the size gate. Pips, the rank alphabet, the court emblem and
	// the back land at M2–M3 (spec: Anatomy of a face).
	function card(opts) {
		var o = opts || {}, S = streams(o.seed == null ? 1 : o.seed), r = roles(o.brand, o.theme);
		var p = o.precision == null ? 0 : o.precision;
		var col = function (role) {
			var pin = o[role];
			return pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);
		};
		var rx = n(24 + 12 * S('card:rx')(), p);
		var lw = n(3 * (o.weight == null ? 1 : o.weight), 2);
		var g = o.face === false ? '' : el('rect', ['x', -HW, 'y', -HH, 'width', W, 'height', H, 'rx', rx, 'fill', col('stock')]);
		g += el('rect', ['x', n(-HW + 1.5, p), 'y', n(-HH + 1.5, p), 'width', n(W - 3, p), 'height', n(H - 3, p),
			'rx', n(Math.max(rx - 1.5, 0), p), 'fill', 'none', 'stroke', col('ink'), 'stroke-width', lw]);
		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		return el('svg', ['xmlns', NS, 'viewBox', [-HW, -HH, W, H].join(' '),
			'width', o.size == null ? null : n(o.size), 'height', o.size == null ? null : n(o.size * H / W)].concat(a11y), g);
	}

	return { card: card, palette: palette, IDX: IDX };
});
