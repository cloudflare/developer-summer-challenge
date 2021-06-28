import * as DB from 'worktop/kv';
import type { KV } from 'worktop/kv';

declare const DATA: KV.Namespace;

export function read<T>(key: string): Promise<T|null> {
	return DB.read<T>(DATA, key, 'json');
}

export function write<T>(key: string, value: T, options?: DB.Options.Write): Promise<boolean> {
	return DB.write<T>(DATA, key, value, { ...options, toJSON: true });
}

export function toCount(): Promise<string> {
	return DB.read(DATA, 'prizes:count', 'text').then(v => v || '300+');
}

// @see https://stackoverflow.com/a/32686261
export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
