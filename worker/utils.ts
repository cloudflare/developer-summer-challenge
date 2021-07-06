import * as DB from 'worktop/kv';
import type { KV } from 'worktop/kv';
import type { ServerResponse } from 'worktop/response';

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

export function render(res: ServerResponse, template: string, values: Record<string, string> = {}) {
	for (let key in values) {
		template = template.replace('{{ ' + key + ' }}', values[key]);
	}
	res.setHeader('Content-Type', 'text/html;charset=UTF-8');
	res.send(200, template);
}
