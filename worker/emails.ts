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


export function confirm(entry: Entry): Promise<boolean> {
	return send('devchallenge-confirm', entry, {
		firstname: entry.firstname,
		code: 'abc123', // TODO
	});
}
