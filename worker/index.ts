import { Router } from 'worktop';
import * as Cache from 'worktop/cache';
import * as Signup from './signup';
import * as Sheets from './sheet';
import * as utils from './utils';

import type { Entry } from './signup';
import type { ServerResponse } from 'worktop/response';

// @ts-ignore :: injected
import HTML from 'index.html';

const API = new Router;

function toError(res: ServerResponse, status: number, reason: string) {
	return res.send(status, { status, reason });
}

/**
 * GET /
 * Render HTML page
 */
API.add('GET', '/', async (req, res) => {
	// Short-term TTL for box count update
	res.setHeader('Cache-Control', 'public,max-age=60');
	res.setHeader('Content-Type', 'text/html;charset=UTF-8');
	// TODO: replace {{count}} inside HTML content
	// const value = await KV.count();
	return res.send(200, HTML);
});

/**
 * POST /signup
 * Accept the initial signup
 */
API.add('POST', '/signup', async (req, res) => {
	try {
		var input = await req.body<Entry>();
	} catch (err) {
		return toError(res, 400, 'Error parsing input');
	}

	// TODO: import validation lib
	let errors: Record<string, string> = {};
	let { email, firstname, lastname } = input || {};

	email = String(email||'').trim();
	firstname = String(firstname||'').trim();
	lastname = String(lastname||'').trim();

	if (email.length < 1) {
		errors.email = 'Required';
	} else if (!utils.isEmail(''+email)) {
		errors.email = 'Invalid email address';
	}

	if (firstname.length < 1) errors.firstname = 'Required';
	if (lastname.length < 1) errors.lastname = 'Required';
	if (Object.keys(errors).length > 1) {
		return res.send(422, { errors });
	}

	let exists = await Signup.find(email);
	if (exists) return toError(res, 400, 'You have already signed up');

	// Generate new `Entry` record
	let entry = Signup.prepare({ email, firstname, lastname });

	let range = await Sheets.append(entry);
	if (!range) return toError(res, 500, 'Error saving registration details');
	console.log('~> range', range);

	entry.range = range;
	let isOK = await Signup.save(entry);
	if (!isOK) return toError(res, 500, 'Error persisting entry');

	return res.end('OK');
});

// init; attach Cache API
Cache.listen(API.run);
