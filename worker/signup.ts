import { uid } from 'worktop/utils';
import { read, write } from './utils';

type DATETIME = number; // seconds

export interface Entry {
	email: string;
	firstname: string;
	lastname: string;
	code: string;
	created_at: DATETIME;
	submit_at?: DATETIME;
	projecturl?: string;
	demourl?: string;
	cftv?: boolean;
}

const toKey = (email: string) => `user:${email}`;

export function prepare(values: Pick<Entry, 'email'|'firstname'|'lastname'>): Entry {
	return {
		...values,
		code: uid(64),
		created_at: Date.now() / 1e3 | 0,
	};
}

export function find(email: string): Promise<Entry|null> {
	let key = toKey(email);
	return read<Entry>(key);
}

export function save(entry: Entry): Promise<boolean> {
	let key = toKey(entry.email);
	return write<Entry>(key, entry);
}
