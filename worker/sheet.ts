import { generate } from './gtoken';
import { read, write } from './utils';
import type { Entry } from './signup';

declare const SHEET_ID: string; // wrangler ENV

/**
 * Get or Create a JWT for the Google API
 */
async function authenticate(): Promise<string> {
	let token = await read<string>('sheets:token');
	if (token) return token;

	token = await generate();

	try {
		await write('sheets:token', token, { expiration: 1800 }); // 30min
	} finally {
		return token;
	}
}

async function send<T>(method: string, pathname: string, body: T) {
	let token = await authenticate();

	let API = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` + pathname;
	let data = body ? JSON.stringify(body) : null;

	return fetch(API, {
		method,
		body: data,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
	});
}

function toStatus(code: number): string {
	if (code === 1) return 'SIGNUP';
	if (code === 2) return 'CONFIRM';
	if (code === 3) return 'SUBMIT';
	if (code === 4) return 'AWARD';
	return '' + code;
}

// @see https://stackoverflow.com/a/45231836
function toDate(seconds: number): string {
	return `=${seconds}/86400+date(1970,1,1)`;
}

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @example https://developers.google.com/sheets/api/samples/writing#append_values
 */
export async function append(entry: Entry): Promise<string | void> {
	const range = 'Sheet1!A1:H1';

	// firstname|lastname|email|status|created_at|last_update|project_link
	let res = await send('POST', `/values/${range}:append?valueInputOption=USER_ENTERED`, {
		range: range,
		majorDimension: 'ROWS',
		values: [
			[
				entry.firstname, // A
				entry.lastname, // B
				entry.email, // C
				toStatus(entry.status), // D
				toDate(entry.created_at), // E
				toDate(entry.last_update || entry.created_at), // F
				null, // G – project comes later
			]
		],
	});

	let data = await res.json() as {
		spreadsheetId: string;
		tableRange: string;
		updates: {
			updatedRange: string;
			spreadsheetId: string;
			updatedColumns: number;
			updatedCells: number;
			updatedRows: number;
		}
	};

	if (res.ok) {
		// eg => "Sheet1!A3:F3"
		return data.updates.updatedRange;
	}
}
