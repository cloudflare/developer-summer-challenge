import { Router } from 'worktop';
import * as Cache from 'worktop/cache';
import * as Sparkpost from './emails';
import * as Signup from './signup';
import * as utils from './utils';
import * as Code from './code';

import type { Entry } from './signup';
import type { ULID } from 'worktop/utils';
import type { ServerResponse } from 'worktop/response';

// @ts-ignore :: injected
import LANDING from 'index.html';
// @ts-ignore :: injected
import CONFIRM from 'confirm/index.html';
// @ts-ignore :: injected
import SUBMIT from 'submit/index.html';
// @ts-ignore :: injected
import ADMIN from 'admin/index.html';
// @ts-ignore :: injected
import DONE from 'done/index.html';

const API = new Router;

function toError(res: ServerResponse, status: number, reason: string) {
	return res.send(status, { status, reason });
}

/**
 * GET /
 * Render HTML page
 */
API.add('GET', '/', async (req, res) => {
	const count = await utils.toCount();
	// Short-term TTL for remaining swag updates
	res.setHeader('Cache-Control', 'public,max-age=60');
	return utils.render(res, LANDING, { count });
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

	// TODO: approve email content
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
	try {
		var input = await req.body<Entry>();
	} catch (err) {
		return toError(res, 400, 'Error parsing input');
	}

	let { email, code, projecturl, demourl, cftv } = input || {};
	projecturl = String(projecturl||'').trim();
	demourl = String(demourl||'').trim();
	email = String(email||'').trim();
	code = String(code||'').trim();

	cftv = /^(1|true|on)$/.test(''+cftv);

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
	entry = { ...entry, projecturl, demourl, cftv };
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
	const items = await Signup.all();

	// All `uid` keys are ULIDs (timestamp-based)
	items.sort((a, b) => b.uid.localeCompare(a.uid));

	const HTML = ADMIN.replace(
		/['"]{{ entries }}["']/,
		JSON.stringify(JSON.stringify(items))
	);

	return utils.render(res, HTML, { count });
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

// init; attach Cache API
Cache.listen(API.run);
