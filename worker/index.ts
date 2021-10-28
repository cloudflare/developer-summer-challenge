import { Router, listen } from 'worktop';
import * as Sparkpost from './emails';
import * as Signup from './signup';
import * as utils from './utils';
import * as Code from './code';

import type { ULID } from 'worktop/utils';
import type { ServerResponse } from 'worktop/response';
import type { Entry, Output } from './signup';

// @ts-ignore :: injected
import LANDING from 'index.html';
// @ts-ignore :: injected
import RULES from 'rules/index.html';
// @ts-ignore :: injected
import CONFIRM from 'confirm/index.html';
// @ts-ignore :: injected
import SUBMIT from 'submit/index.html';
// @ts-ignore :: injected
import ADMIN from 'admin/index.html';
// @ts-ignore :: injected
import DONE from 'done/index.html';

const API = new Router;

// November 1, 2021 (11:59 PM Pacific Time)
const CUTOFF = new Date('2021-11-02T06:59:59.999Z');

function toError(res: ServerResponse, status: number, reason: string) {
	return res.send(status, { status, reason });
}

/**
 * GET /
 * Render HTML page
 */
API.add('GET', '/', async (req, res) => {
	let count = await utils.toCount();
	// Temporarily fake it
	let value = Math.min(178, +count || 300);
	count = String(value);
	// Short-term TTL for remaining swag updates
	res.setHeader('Cache-Control', 'public,max-age=60');
	return utils.render(res, LANDING, { count });
});

/**
 * GET /rules
 * Render the Contest Rules HTML page
 */
API.add('GET', '/rules', async (req, res) => {
	res.setHeader('Cache-Control', 'public,max-age=1800');
	return utils.render(res, RULES);
});

/**
 * POST /signup
 * Accept the initial signup
 */
API.add('POST', '/signup', async (req, res) => {
	if (Date.now() > +CUTOFF) {
		return toError(res, 400, 'The registration window has closed.');
	}

	try {
		var input = await req.body<Entry>();
	} catch (err) {
		return toError(res, 400, 'Error parsing input');
	}

	let { email, firstname, lastname } = input || {};
	firstname = String(firstname||'').trim();
	lastname = String(lastname||'').trim();
	email = String(email||'').trim();

	let { errors, invalid } = utils.validate({
		email, firstname, lastname
	}, {
		email(val: string) {
			if (val.length < 1) return 'Required';
			return utils.isEmail(val) || 'Invalid email address';
		},
		firstname(val: string) {
			return val.length > 1 || 'Required';
		},
		lastname(val: string) {
			return val.length > 1 || 'Required';
		}
	});

	if (invalid) {
		return res.send(422, errors);
	}

	let exists = await Signup.find(email);
	if (exists) return toError(res, 400, 'You have already signed up');

	// Generate new `Entry` record
	let entry = Signup.prepare({ email, firstname, lastname });

	let isOK = await Signup.save(entry);
	if (!isOK) return toError(res, 500, 'Error persisting entry');

	isOK = await Code.save(entry);
	if (!isOK) return toError(res, 500, 'Error saving unique code');

	let sent = await Sparkpost.confirm(entry);
	if (!sent) return toError(res, 500, 'Error sending confirmation email');

	return utils.render(res, CONFIRM, { email: entry.email });
});

/**
 * GET /submit?code
 * Render the unique submission form
 */
API.add('GET', '/submit', async (req, res) => {
	let code = req.query.get('code');
	if (!code) return toError(res, 400, 'Missing code');

	let email = await Code.find(code);
	if (!email) return toError(res, 404, 'Unknown or expired code');

	let entry = await Signup.find(email);
	if (!entry) return toError(res, 500, 'Error loading entry');

	return utils.render(res, SUBMIT, {
		firstname: entry.firstname,
		lastname: entry.lastname,
		email: entry.email,
		code: entry.code,
	});
});

/**
 * POST /submit
 * Accept the project submission
 */
API.add('POST', '/submit', async (req, res) => {
	if (Date.now() > +CUTOFF) {
		return toError(res, 400, 'The submission window has closed.');
	}

	try {
		var input = await req.body<Entry>();
	} catch (err) {
		return toError(res, 400, 'Error parsing input');
	}

	let { email, code, projecturl, demourl, cftv, ccsa } = input || {};
	projecturl = String(projecturl||'').trim();
	demourl = String(demourl||'').trim();
	email = String(email||'').trim();
	code = String(code||'').trim();

	cftv = /^(1|true|on)$/.test(''+cftv);
	ccsa = /^(1|true|on)$/.test(''+ccsa);

	let prev = await Code.find(code);
	if (!prev) return toError(res, 404, 'Unknown or expired code');
	if (email && prev !== email) return toError(res, 403, 'Mismatch');

	let entry = await Signup.find(email);
	if (!entry) return toError(res, 500, 'Error loading entry');

	let { errors, invalid } = utils.validate({ projecturl, demourl }, {
		projecturl(val: string) {
			if (val.length < 1) return 'Required';
			return /^https?:\/\//.test(val) || 'Invalid URL';
		},
		demourl(val: string) {
			if (val.length < 1) return 'Required';
			return /^https?:\/\//.test(val) || 'Invalid URL';
		}
	});

	if (invalid) {
		return res.send(422, errors);
	}

	// Save only the new values
	entry = { ...entry, projecturl, demourl, cftv, ccsa };
	entry.submit_at = utils.seconds();

	let isOK = await Signup.save(entry);
	if (!isOK) return toError(res, 500, 'Error updating entry');

	isOK = await Code.destroy(entry.code);
	if (!isOK) return toError(res, 500, 'Error consuming token');

	// send "submission received" email
	let sent = await Sparkpost.submit(entry);
	if (!sent) return toError(res, 500, 'Error sending confirmation email');

	return utils.render(res, DONE, {
		firstname: entry.firstname,
		email: entry.email,
	});
});

/**
 * GET /admin
 * Render the Admin dashboard
 * @NOTE Access protection
 */
API.add('GET', '/admin', async (req, res) => {
	const count = await utils.toCount();
	return utils.render(res, ADMIN, { count });
});

/**
 * GET /admin/list
 * Return all "user:<email>" keys to Admin dashboard
 * @NOTE Access protection
 */
API.add('GET', '/admin/list', async (req, res) => {
	let items = await Signup.all();
	return res.send(200, items, {
		'cache-control': 'private,max-age=60'
	});
});

/**
 * POST /admin/chunk
 * Exchange "user:<email>" keys for User data
 * @NOTE Access protection
 */
API.add('POST', '/admin/chunk', async (req, res) => {
	let keys = await req.body.json();
	let values: Output[] = await Promise.all(
		keys.map(Signup.profile)
	);
	return res.send(200, values);
});

/**
 * POST /admin/award
 * Accept a winner!
 * @NOTE Access protection
 */
API.add('POST', '/admin/award', async (req, res) => {
	try {
		type Input = Pick<Entry, 'uid'|'email'> & { count: number };
		var input = await req.body<Input>();
	} catch (err) {
		return toError(res, 400, 'Error parsing input');
	}

	let { uid, email, count } = input || {};
	uid = String(uid||'').trim() as ULID;
	email = String(email||'').trim();
	count = +(count || 0);

	let { errors, invalid } = utils.validate({ email, uid }, {
		email(val: string) {
			if (val.length < 1) return 'Required';
			return utils.isEmail(val) || 'Invalid email address';
		},
		uid(val: string) {
			return val.length === 26 || 'Invalid identifier';
		},
	});

	if (invalid) {
		return res.send(422, errors);
	}

	let entry = await Signup.find(email);
	if (!entry) return toError(res, 404, 'Unknown entry');
	if (entry.uid !== uid) return toError(res, 404, 'Unknown entry');
	if (entry.winner) return toError(res, 400, 'Already a winner!');

	let remains = await utils.toCount().then(x => parseInt(x, 10));
	if (Math.abs(remains - count) >= 5) return toError(res, 400, 'Count is out of sync!');

	entry.winner = true;
	entry.code = entry.uid;
	entry.award_at = utils.seconds();

	let isOK = await Code.save(entry);
	if (!isOK) return toError(res, 500, 'Error saving unique code');

	isOK = await Signup.save(entry);
	if (!isOK) return toError(res, 500, 'Error persisting entry');

	isOK = await utils.setCount(count);
	if (!isOK) return toError(res, 500, 'Error syncing remaining count');

	// send "you won a swag box!" email
	let sent = await Sparkpost.winner(entry);
	if (!sent) return toError(res, 500, 'Error sending winner email');

	res.end('OK');
});

// init
listen(API.run);
