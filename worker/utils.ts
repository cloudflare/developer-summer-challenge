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

export function remove(key: string): Promise<boolean> {
	return DB.remove(DATA, key);
}

export function toCount(): Promise<string> {
	return DB.read(DATA, '::remain', 'text').then(v => v || '300+');
}

// @see https://stackoverflow.com/a/32686261
export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type ErrorMessages<R> = { [K in keyof R]?: string };
type Validator<T> = (value: any, input: T) => string | boolean;
type Validity<R> = { invalid: boolean; errors: ErrorMessages<R> };
export function validate<
	T extends Record<string, any>,
	R extends Record<string, Validator<T>>,
>(input: T, rules: R): Validity<R> {
	let tmp, invalid = false;
	let errors: ErrorMessages<R> = {};
	for (let key in rules) {
		tmp = rules[key](input[key], input);
		if (tmp !== true) {
			errors[key] = tmp || 'Required';
			invalid = true;
		}
	}
	return { invalid, errors };
}

export function render(res: ServerResponse, template: string, values: Record<string, string> = {}) {
	for (let key in values) {
		template = template.replace('{{ ' + key + ' }}', values[key]);
	}
	res.setHeader('Content-Type', 'text/html;charset=UTF-8');
	res.send(200, template);
}
