#!/usr/bin/env node
const { resolve } = require('path');
const stylus = require('stylus');
const $ = require('./util');

const input = resolve(__dirname, '../src');
const output = resolve(__dirname, '../build');

/**
 * @param {boolean} [isProd]
 * @returns {Promise<string>}
 */
async function styles(isProd) {
	let filename = resolve(input, 'index.styl');

	let code = await $.read(filename);
	let ctx = stylus(code, { filename, compress: isProd });
	if (!isProd) ctx.set('sourcemap', { inline: true });
	return new Promise((res, rej) => {
		ctx.render((err, css) => err ? rej(err) : res(css));
	});
}

/**
 * @param {boolean} [isProd]
 */
async function build(isProd) {
	let timer = $.timer();

	let [HTML, css] = await Promise.all([
		$.read('index.html', input),
		styles(isProd),
	]);

	if (css) css = '<style>' + css + '</style>';
	// if (js) js = '<script defer>' + js + '</script>';
	let js = '';

	HTML = (
		HTML
			.replace('<!-- INJECT:STYLES -->', css||'')
			.replace('<!-- INJECT:SCRIPTS -->', js||'')
	);

	if (isProd) {
		HTML = require('html-minifier-terser').minify(HTML, {
			minifyJS: true,
			minifyCSS: false,
			removeComments: true,
			collapseWhitespace: true,
			removeAttributeQuotes: true,
			useShortDoctype: true,
		});
	}

	let file = resolve(output, 'index.html');
	await $.write(file, HTML);

	console.log('~> built in %dms', timer());
}

(async function () {
	const [action] = process.argv.slice(2);

	// clean slate
	await $.rm(output);
	await $.mkdir(output);

	const isDev = action === 'dev';
	if (!isDev && action !== 'build') {
		return $.bail(`Unknown command: "${action}"`);
	}

	await build(!isDev);

	if (isDev) {
		const builder = build.bind(0, false);

		console.log('~> watching "src" directory');
		await require('watchlist').watch([input], builder, {
			clear: true,
			cwd: '.',
		});

		const { PORT=8080 } = process.env;
		console.log('~> watching "build" directory');
		console.log('~> starting dev server on localhost:%s', PORT);

		await require('servor')({
			root: output,
			fallback: 'index.html',
			static: true,
			reload: true,
			inject: '',
			port: PORT,
		});
	}
})().catch(err => {
	return $.bail(err.stack);
});
