import type { Entry } from './signup';

// wrangler secret
// @see https://developers.sparkpost.com/api/#header-authentication
declare const SPARKPOST_KEY: string;

// @see https://developers.sparkpost.com/api/transmissions/#transmissions-post-send-a-template
async function send(
	templateid: string,
	recipient: Entry,
	values?: Record<string, string>
): Promise<boolean> {
	const res = await fetch('https://api.sparkpost.com/api/v1/transmissions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': SPARKPOST_KEY,
		},
		body: JSON.stringify({
			content: {
				template_id: templateid,
				use_draft_template: true
			},
			recipients: [{
				address: {
					email: recipient.email,
					name: recipient.firstname + ' ' + recipient.lastname,
				},
				substitution_data: values || {},
			}]
		})
	});

	let data = await res.json() as {
		results: {
			id: string;
			total_rejected_recipients: number;
			total_accepted_recipients: number;
		}
	};

	return res.ok && data.results.total_accepted_recipients === 1;
}

/**
 * Confirming their signup
 * Sending unique submission form
 */
export function confirm(entry: Entry): Promise<boolean> {
	return send('devchallenge-confirm', entry, {
		firstname: entry.firstname,
		code: entry.code,
	});
}

/**
 * Received their project submission
 */
export function submit(entry: Entry): Promise<boolean> {
	return send('devchallenge-submit', entry, {
		firstname: entry.firstname,
		projecturl: entry.projecturl!,
		demourl: entry.demourl!,
	});
}

/**
 * Notify someone that they won!
 * Sending "/shipping?code={code}" link
 */
export function winner(entry: Entry): Promise<boolean> {
	return send('devchallenge-winner', entry, {
		firstname: entry.firstname,
		code: entry.code,
	});
}

/**
 * Confirm "/shipping" form is done
 * Nothing else to be done~!
 */
 export function complete(entry: Entry): Promise<boolean> {
	return send('devchallenge-complete', entry, {
		firstname: entry.firstname,
	});
}
