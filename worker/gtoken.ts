import * as Base64 from 'worktop/base64';
import { sign } from 'worktop/crypto';

// @see https://developers.google.com/identity/protocols/oauth2/service-account
declare const GTOKEN_EMAIL: string; // wrangler ENV
declare const GTOKEN_PRIVKEY: string; // "-----BEGIN PRIVATE KEY----- ..." via wrangler secret
declare const GTOKEN_KID: string; // `json.private_key_id` via wrangler secret

function encode(input: string | object) {
	return Base64.base64url(typeof input === 'string' ? input : JSON.stringify(input));
}

function str2ab(str: string) {
	let i=0, len=str.length;
	const buf = new ArrayBuffer(len);
	const view = new Uint8Array(buf);
	for (; i < len; i++) {
		view[i] = str.charCodeAt(i);
	}
	return buf;
}

// TODO: BUG W/ SECRETS? any "\n" => "\\n"
const PRIVATE = "-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----";

function convert() {
	// fetch the part of the PEM string between header and footer
	const contents = PRIVATE.substring(
		'-----BEGIN PRIVATE KEY-----'.length,
		PRIVATE.length - '-----END PRIVATE KEY-----'.length
	);

	return crypto.subtle.importKey(
		'pkcs8',
		str2ab(
			Base64.decode(contents)
		),
		{
			name: 'RSASSA-PKCS1-v1_5',
			hash: 'SHA-256',
		},
		false,
		['sign']
	);
}

export async function generate(): Promise<string> {
	const tstamp = Date.now() / 1e3 | 0; // seconds
	const expires = tstamp + 3600; // required

	const header = encode({
		alg: 'RS256',
		typ: 'JWT',
		kid: GTOKEN_KID
	});

	const payload = encode({
		iss: GTOKEN_EMAIL,
		sub: GTOKEN_EMAIL,
		aud: 'https://sheets.googleapis.com/',
		iat: tstamp,
		exp: expires,
	});

	const key = await convert();

	// Generate signaure
	const content = header + '.' + payload;
	const buffer = await sign('RSASSA-PKCS1-v1_5', key, content);

	// @ts-ignore – internal TypeScript bug: ArrayLike<number> vs number[]
	const ascii = String.fromCharCode.apply(null, new Uint8Array(buffer));
	return content + '.' + encode(ascii);
}
