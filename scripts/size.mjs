// Cross-platform `npm run size`: minify + gzip via Node APIs, no shell pipes (ADR 009).
// Prints the gzipped byte count of the minified library as a bare integer and exits 1 when it
// is above package.json `config.sizeBudget`. Never measure with the gzip CLI: its header carries
// the file name, so the number drifts between machines.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { minify } from 'terser';

try {
	const src = await readFile(new URL('../cards.js', import.meta.url), 'utf8');
	const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
	const min = await minify(src, { compress: true, mangle: true });
	if (!min.code) throw new Error('terser produced no output');
	const bytes = gzipSync(Buffer.from(min.code), { level: 9 }).length;
	console.log(bytes);
	const budget = pkg.config && pkg.config.sizeBudget;
	if (budget && bytes > budget) {
		console.error(`over budget: ${bytes} B > ${budget} B`);
		process.exit(1);
	}
} catch (err) {
	console.error(err && err.message ? err.message : err);
	process.exit(1);
}
