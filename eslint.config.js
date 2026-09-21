// Flat config (ESLint 9+). The library is ES5 and ships as one file that works as a <script>
// and as a CommonJS module (ADR 007); tests and scripts are modern ES modules run by Node.
// CommonJS on purpose: there is no "type": "module" here.
module.exports = [
	{
		ignores: ['*.min.js', '*.d.ts', 'node_modules/', '.agents/'],
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 5,
			sourceType: 'script',
			globals: {
				window: 'readonly',
				document: 'readonly',
				self: 'readonly',
				IntersectionObserver: 'readonly',
				module: 'writable',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'error',
			'no-redeclare': 'error',
		},
	},
	{
		files: ['**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: {
				process: 'readonly',
				Buffer: 'readonly',
				console: 'readonly',
				URL: 'readonly',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'error',
		},
	},
];
