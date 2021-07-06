#!/usr/bin/env node
const { join } = require('path');
const $ = require('./util');

const input = join(__dirname, '../worker');
const output = join(__dirname, '../build');

(async function () {
	const [action] = process.argv.slice(2);

	const isProd = action === 'build';
	if (!isProd && action !== 'dev') {
		return $.bail(`Unknown command: "${action}"`);
	}

	let timer = $.timer();
	await require('esbuild').build({
		entryPoints: [join(input, 'index.ts')],
		outfile: join(output, 'index.js'),
		bundle: true,
		format: 'esm',
		charset: 'utf8',
		sourcemap: false,
		minify: false,
		write: true,
		resolveExtensions: ['.ts', '.mjs', '.js', '.json'],
		mainFields: ['worker', 'browser', 'module', 'jsnext', 'main'],
		conditions: ['worker', 'browser', 'import', 'production'],
		loader: {
			'.ts': 'ts',
			'.html': 'text',
		},
		plugins: [{
			name: 'HTML',
			setup(build) {
				// load prebuilt "*.html" files from `build` dir
				build.onResolve({ filter: /\.html?$/ }, args => ({
					path: join(output, args.path),
				}));
			}
		}]
	});

	console.log('~> built in %sms', timer());

	if (isProd) {
		await $.ls(output).then(files => {
			return Promise.all(
				files.map(str => {
					if (str === 'index.js') return;
					console.log('~> rm "build/%s" item', str);
					str = join(output, str);
					return $.rm(str);
				})
			);
		});
	}
})().catch(err => {
	return $.bail(err.stack);
});
