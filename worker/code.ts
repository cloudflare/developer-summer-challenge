import { uid } from 'worktop/utils';
import { read, write, remove } from './utils';
import type { Entry } from './signup';

export type Code = Entry['email'];

const toKey = (code: string) => `code:${code}`;

export function find(code: string): Promise<Code|null> {
	let key = toKey(code);
	return read<Code>(key);
}

export function save(entry: Entry): Promise<boolean> {
	let key = toKey(entry.code);
	return write<Code>(key, entry.email);
}

export function destroy(code: string): Promise<boolean> {
	let key = toKey(code);
	return remove(key);
}
