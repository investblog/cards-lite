// The browser half of the gate, run by hand: `node scripts/browser-gate.mjs [--mutate]`.
//
// It serves the repo, opens test/verify.html in every engine it can find, and does it twice —
// once normally and once under prefers-reduced-motion, because the reduced path is a different
// branch of the page and was for a while only reasoned about.
//
// With --mutate it then breaks the library on purpose, one anchor at a time, and reports any
// check that never went red. That is the M5 lesson in executable form: five checks in this repo
// passed against a library that was broken, and the only thing that would have told us was
// watching them fail. cards.js is restored with `git checkout` after every mutation, including
// on a crash.
//
// Playwright is NOT a dependency of this package — the library ships with none, and CI runs the
// Node gate only. This script uses whatever playwright is already on the machine; if none is,
// it says so and exits 0, because a missing dev tool is not a failing library.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'cards.js');
const MUTATE = process.argv.includes('--mutate');

function playwright() {
	const require = createRequire(import.meta.url);
	for (const id of ['playwright', 'playwright-core']) {
		try { return require(id); } catch { /* keep looking */ }
	}
	// the common case on this machine: playwright lives inside a globally installed MCP server
	try {
		// execSync, not execFileSync: npm is a .cmd on Windows, which Node refuses to spawn
		// without a shell — and a shell with an args array is the deprecated combination
		const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
		return createRequire(path.join(root, '@playwright', 'mcp', 'package.json'))('playwright-core');
	} catch { return null; }
}

const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css' };
function serve() {
	return new Promise((res) => {
		const s = http.createServer((req, rq) => {
			const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
			fs.readFile(f, (e, d) => {
				if (e) { rq.writeHead(404); return rq.end('no'); }
				// no-store, so a run never reads the previous version of the library
				rq.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
				rq.end(d);
			});
		});
		s.listen(0, () => res([s, s.address().port]));
	});
}

async function verify(pw, engine, port, motion) {
	const browser = await pw[engine].launch();
	try {
		const page = await (await browser.newContext({ reducedMotion: motion })).newPage();
		await page.goto(`http://localhost:${port}/test/verify.html`);
		// the page sets its title to PASS or FAIL when it is done; a suite that dies leaves the
		// original title, which is the third outcome and must not read as either
		await page.waitForFunction(() => document.title !== 'cards-lite — verify', null, { timeout: 60000 });
		/* global document -- the three lines below run inside the page, not in Node */
		return await page.evaluate(() => ({
			verdict: document.getElementById('verdict').textContent,
			all: [...document.querySelectorAll('#out li')].map((l) => l.textContent.split(' — ')[0]),
			fails: [...document.querySelectorAll('#out li.fail')].map((l) => l.textContent),
		}));
	} finally { await browser.close(); }
}

// Each entry breaks one thing the page claims to check. The label says what was broken, never
// which check should notice — a mutation that reddens a check nobody expected is information.
const MUTATIONS = [
	['deck is not a function', 'deck: deck,', 'deck: 0,'],
	['unclosed <defs>', "(c.defs ? el('defs', [], c.defs) : '')", "(c.defs ? '<defs>' + c.defs : '')"],
	['court panel resized', "'width', 260,", "'width', 262,"],
	['the row index clamp cut', "Math.max(0.32 + 0.30 * S('spread:row:reveal')(), IDX / W)", "(0.12 + 0.02 * S('spread:row:reveal')())"],
	['pins ignored', "return pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);", 'return toHex(r[role]);'],
	['pips unpainted', "'fill', flat ? suit : 'none',", "'fill', 'none',"],
	['salt ignored for ids', "S('ids' + (salt || ''))", "S('ids')"],
	['the M4 deal restored', "var spin = -Math.asin(0.6 * pad / (Math.sqrt(W * W + H * H) / 2)) / DEG *", 'var spin = -12 - 16 *'],
	['reduced-motion gate cut', "'@media(prefers-reduced-motion:reduce){'", "'@media(BROKEN:reduce){'"],
	// the settle check guards `from` with no `to`, so breaking it takes both halves: something to
	// travel toward, and a forwards fill to keep it there once the deal has finished
	['a to-based deal that stays', ["'deg);opacity:0}}'", "'s backwards cubic-bezier(.2,.7,.3,1)}'"],
		["'deg);opacity:0}to{transform:translate(40px)}}'", "'s forwards cubic-bezier(.2,.7,.3,1)}'"]],
	['destroy() leaves markup', "host.innerHTML = ''; }", "host.innerHTML = 'x'; }"],
];

const restore = () => execFileSync('git', ['checkout', '--', 'cards.js'], { cwd: ROOT });

async function main() {
	const pw = playwright();
	if (!pw) {
		console.log('no playwright on this machine — skipping the browser gate.');
		console.log('install one with:  npm i -g playwright  &&  npx playwright install');
		return 0;
	}
	const [server, port] = await serve();
	let bad = 0, names = [];
	try {
		for (const engine of ['chromium', 'firefox', 'webkit']) {
			for (const motion of ['no-preference', 'reduce']) {
				let r;
				try { r = await verify(pw, engine, port, motion); } catch (e) {
					console.log(`${engine} / ${motion}: could not run — ${e.message.split('\n')[0]}`);
					bad++; continue;
				}
				names = [...new Set([...names, ...r.all])];
				console.log(`${(engine + ' / ' + motion).padEnd(26)} ${r.verdict}`);
				r.fails.forEach((f) => console.log('     ✘ ' + f));
				if (!r.verdict.startsWith('ALL GREEN')) bad++;
			}
		}

		if (MUTATE && !bad) {
			console.log('\n── mutations: break the library, watch the page go red ──');
			const red = new Set();
			for (const [label, from, to] of MUTATIONS) {
				const pairs = Array.isArray(from) ? from.map((f, i) => [f, to[i]]) : [[from, to]];
				let src = fs.readFileSync(SRC, 'utf8'), ok = true;
				for (const [a, b] of pairs) {
					if (!src.includes(a)) { ok = false; break; }
					src = src.replace(a, b);
				}
				if (!ok) { console.log(`SKIP  ${label} — the anchor has moved; fix this mutation`); bad++; continue; }
				fs.writeFileSync(SRC, src);
				let r;
				try { r = await verify(pw, 'chromium', port, label.includes('reduced') ? 'reduce' : 'no-preference'); } finally { restore(); }
				r.fails.map((f) => f.split(' — ')[0]).forEach((f) => red.add(f));
				console.log(`${r.fails.length ? 'RED  ' : '.... '} ${label.padEnd(28)} ${r.verdict}`);
			}
			const never = names.filter((n) => !red.has(n));
			console.log(never.length
				? '\nNEVER SEEN FAILING — write a mutation for each, or the check is decoration:\n' + never.map((n) => '  ' + n).join('\n')
				: '\nevery check on the page has been seen to fail.');
			bad += never.length;
		}
	} finally {
		server.close();
		restore();
	}
	console.log(bad ? `\n${bad} problem(s)` : '\nthe browser gate is green.');
	return bad ? 1 : 0;
}

process.exit(await main());
