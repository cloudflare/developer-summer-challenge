import { read, write } from './utils';

// Status
const SIGNUP = 1;
const CONFIRM = 2;
const SUBMIT = 3;
const AWARD = 4;

type DATETIME = number; // seconds

export interface Entry {
	email: string;
	firstname: string;
	lastname: string;
	status: 1 | 2 | 3 | 4;
	link: string | null;
	created_at: DATETIME;
	last_update: DATETIME;
	range?: string;
}

const toKey = (email: string) => `user:${email}`;

export function prepare(values: Pick<Entry, 'email'|'firstname'|'lastname'>): Entry {
	let timestamp = Date.now() / 1e3 | 0;

	return {
		...values,
		link: null,
		status: SIGNUP,
		created_at: timestamp,
		last_update: timestamp,
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

export function confirm(user: Entry): Promise<boolean> {
	user.last_update = Date.now() / 1e3 | 0;
	user.status = CONFIRM;
	return save(user);
}

export function submit(user: Entry, link: string): Promise<boolean> {
	user.last_update = Date.now() / 1e3 | 0;
	user.status = SUBMIT;
	user.link = link;
	return save(user);
}
