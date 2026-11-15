// Creates/updates .env with the login username, a scrypt password hash, and a session secret.
// Usage: MPL_USERNAME=you@example.com MPL_PASSWORD='secret' node scripts/setup-auth.mjs
// If MPL_PASSWORD is omitted you are prompted (input is hidden).
import { randomBytes, scrypt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

const N = 16384;
const r = 8;
const p = 1;

function prompt(question, hidden) {
	return new Promise((resolve) => {
		let muted = false;
		const out = new Writable({
			write(chunk, _enc, cb) {
				if (!muted) process.stdout.write(chunk);
				cb();
			}
		});
		const rl = createInterface({ input: process.stdin, output: out, terminal: true });
		rl.question(question, (answer) => {
			rl.close();
			if (hidden) process.stdout.write('\n');
			resolve(answer);
		});
		muted = hidden;
	});
}

const username = process.env.MPL_USERNAME || (await prompt('Username (email): ', false));
const password = process.env.MPL_PASSWORD || (await prompt('Password: ', true));
if (!username || !password) {
	console.error('Username and password are required.');
	process.exit(1);
}

const salt = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
	scrypt(password, salt, 64, { N, r, p }, (err, key) => (err ? reject(err) : resolve(key)))
);
const passwordHash = `scrypt:${N}:${r}:${p}:${salt.toString('base64url')}:${hash.toString('base64url')}`;

const envPath = new URL('../.env', import.meta.url);
const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8').split(/\r?\n/) : [];
const values = new Map();
for (const line of existing) {
	const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
	if (m) values.set(m[1], m[2]);
}

values.set('AUTH_USERNAME', username);
values.set('AUTH_PASSWORD_HASH', passwordHash);
// Rotating the secret signs everyone out, so it is only generated once.
if (!values.get('SESSION_SECRET')) values.set('SESSION_SECRET', randomBytes(48).toString('base64url'));
if (!values.has('METRON_API_TOKEN')) values.set('METRON_API_TOKEN', '');

const body = [...values].map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
writeFileSync(envPath, body, { mode: 0o600 });
console.log(`Saved credentials for ${username} to .env (password stored as a scrypt hash).`);
