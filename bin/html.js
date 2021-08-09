#!/usr/bin/env node
const { existsSync } = require('fs');
const { resolve, dirname } = require('path');
const stylus = require('stylus');
const $ = require('./util');

const input = resolve(__dirname, '../src');
const output = resolve(__dirname, '../build');

const PAGES = [
	'index.html',
	'admin/index.html',
	'confirm/index.html',
	'submit/index.html',
	'rules/index.html',
	'done/index.html',
];

/**
 * @param {string} file
 * @param {boolean} [isProd]
 * @returns {Promise<string>}
 */
async function styles(file, isProd) {
	let paths = [input];
	let filename = resolve(input, file);

	let code = await $.read(filename);
	let ctx = stylus(code, { filename, paths, compress: isProd });
	if (!isProd) ctx.set('sourcemap', { inline: true });
	return new Promise((res, rej) => {
		ctx.render((err, css) => err ? rej(err) : res(css));
	});
}

/**
 * @param {string} html
 * @param {boolean} [isProd]
 */
async function build(html, isProd) {
	let tmp, timer = $.timer();
	let HTML = await $.read(html, input);

	while (tmp = /<!--\s*inject:([^\s-]+)\s*-->/g.exec(HTML)) {
		let file = tmp[1];
		let content = '';

		if (/\.styl(us)?$/.test(file)) {
			let css = await styles(file, isProd);
			content = css && ('<style>' + css + '</style>');
		} else if (/\.js$/.test(file)) {
			let js = await $.read(file, input);
			content = js && ('<script defer>' + js + '</script>');
		} else {
			return console.warn('Unknown "%s" file extension', file);
		}

		if (content) {
			HTML = tmp.input.substring(0, tmp.index) + content;
			HTML += tmp.input.substring(tmp.index + tmp[0].length);
		} else {
			return console.warn('Invalid "%s" content', file);
		}
	}

	if (isProd) {
		HTML = require('html-minifier-terser').minify(HTML, {
			minifyJS: true,
			minifyCSS: false,
			removeComments: true,
			collapseWhitespace: true,
			collapseBooleanAttributes: true,
			removeAttributeQuotes: true,
			useShortDoctype: true,
		});
	}

	let file = resolve(output, html);
	let dir = dirname(file);

	existsSync(dir) || await $.mkdir(dir);
	await $.write(file, HTML);

	console.log('~> built "%s" in %dms', html, timer());
}

async function compile(isProd) {
	// clean slate
	await $.rm(output);
	await $.mkdir(output);

	await Promise.all(
		PAGES.map(file => {
			return build(file, isProd);
		})
	);
}

(async function () {
	const [action] = process.argv.slice(2);

	const isDev = action === 'dev';
	if (!isDev && action !== 'build') {
		return $.bail(`Unknown command: "${action}"`);
	}

	await compile(!isDev);

	if (isDev) {
		const builder = compile.bind(0, false);

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
