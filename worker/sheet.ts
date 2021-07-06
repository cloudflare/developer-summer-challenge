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

interface UpdateValuesResponse {
	updatedRange: string;
	spreadsheetId: string;
	updatedColumns: number;
	updatedCells: number;
	updatedRows: number;
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

const APPEND = 'Sheet1!A1:J1'; // special pattern
const toRange = (row: string) => `Sheet1!A${row}:J${row}`;

// @see https://stackoverflow.com/a/45231836
const toDate = (seconds: number) => `=${seconds}/86400+date(1970,1,1)`;

function toRowValues(entry: Entry, range?: string): Array<string|null> {
	let isDone = !!entry.submit_at;
	return [
		/* A */ entry.firstname,
		/* B */ entry.lastname,
		/* C */ entry.email,
		/* D */ isDone ? 'SUBMIT' : 'SIGNUP',
		/* E */ toDate(entry.created_at),
		/* F */ isDone ? toDate(entry.submit_at!) : null,
		/* G */ entry.projecturl || null,
		/* H */ entry.demourl || null,
		/* I */ isDone ? String(+!!entry.cftv) : null,
	];
}

function action(method: 'POST'|'PUT', entry: Entry, range: string) {
	let pathname = `/values/${range}`;
	if (method === 'POST') pathname += ':append';
	return send(method, `${pathname}?valueInputOption=USER_ENTERED`, {
		range: range,
		majorDimension: 'ROWS',
		values: [ toRowValues(entry, range) ],
	});
}

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @example https://developers.google.com/sheets/api/samples/writing#append_values
 */
export async function append(entry: Entry): Promise<string | void> {
	let res = await action('POST', entry, APPEND);

	let data = await res.json() as {
		tableRange: string;
		spreadsheetId: string;
		updates: UpdateValuesResponse;
	};

	if (res.ok) {
		// eg: "Sheet1!A3:F3" => ["Sheet1!A3:F", "3"]
		return data.updates.updatedRange.split(/[:][a-z]/i)[1];
	}
}

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
 */
export function update(entry: Entry): Promise<boolean> {
	return action('PUT', entry, toRange(entry.row!)).then(r => r.ok);
}
