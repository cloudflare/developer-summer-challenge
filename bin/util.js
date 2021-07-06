const fs = require('fs').promises;
const { resolve } = require('path');

/**
 * @param {string} msg
 * @returns {never}
 */
exports.bail = function (msg) {
	console.error('ERROR', msg);
	process.exit(1);
}

/**
 * @param {string} file
 * @param {string} [dir]
 * @returns {Promise<string>}
 */
exports.read = function (file, dir) {
	file = resolve(dir||'.', file);
	return fs.readFile(file, 'utf8');
}

/**
 * @param {string} dir
 */
exports.ls = function (dir) {
	dir = resolve('.', dir);
	return fs.readdir(dir);
}

/**
 * @param {string} file
 * @param {string} data
 */
exports.write = fs.writeFile;

/** @param {string} dir  */
exports.rm = function (dir) {
	// `force` => continue if missing
	return fs.rm(dir, { recursive: true, force: true });
}

/** @param {string} dir */
exports.mkdir = fs.mkdir;

exports.timer = function () {
	let start = Date.now();
	return () => Date.now() - start;
}
