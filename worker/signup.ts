import { uid, ulid } from 'worktop/utils';
import * as utils from './utils';

import type { ULID } from 'worktop/utils';

type DATETIME = number; // seconds

export interface Entry {
	uid: ULID;
	email: string;
	firstname: string;
	lastname: string;
	code: string;
	created_at: DATETIME;
	submit_at?: DATETIME;
	award_at?: DATETIME;
	projecturl?: string;
	demourl?: string;
	winner?: boolean;
	cftv?: boolean;
	ccsa?: boolean;
}

const toKey = (email: string) => `user:${email}`;

export function prepare(values: Pick<Entry, 'email'|'firstname'|'lastname'>): Entry {
	return {
		...values,
		uid: ulid(),
		code: uid(64),
		created_at: utils.seconds(),
	};
}

export function find(email: string): Promise<Entry|null> {
	let key = toKey(email);
	return utils.read<Entry>(key);
}

export function save(entry: Entry): Promise<boolean> {
	let key = toKey(entry.email);
	return utils.write<Entry>(key, entry);
}

export type Output = Omit<Entry, 'code'>;
export async function all(): Promise<Output[]> {
	let output: Output[] = [];

	let prefix = toKey('');
	let paginator = utils.list(prefix);

	for await (let payload of paginator) {
		if (payload.keys.length > 0) {
			await Promise.all(
				payload.keys.map(key => {
					return utils.read<Entry>(key).then(item => {
						if (!item) return;
						let { code, ...rest } = item;
						output.push(rest);
					});
				})
			)
		}
		if (payload.done) {
			return output;
		}
	}

	return output;
}
