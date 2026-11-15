import { createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'mpl_session';
export const SESSION_MAX_AGE_S = 30 * 24 * 3600;

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60_000;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
	return new Promise<Buffer>((resolve, reject) =>
		scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)))
	);
}

function safeEqual(a: Buffer, b: Buffer): boolean {
	return a.length === b.length && timingSafeEqual(a, b);
}

function secret(): string {
	const s = env.SESSION_SECRET;
	if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars). Run `npm run setup:auth`.');
	return s;
}

/** Hash format: scrypt:N:r:p:<salt b64url>:<hash b64url>. Created by scripts/setup-auth.mjs. */
export async function verifyCredentials(username: string, password: string): Promise<boolean> {
	const expectedUser = env.AUTH_USERNAME;
	const stored = env.AUTH_PASSWORD_HASH;
	if (!expectedUser || !stored) throw new Error('AUTH_USERNAME / AUTH_PASSWORD_HASH not set. Run `npm run setup:auth`.');

	const [scheme, N, r, p, salt, hash] = stored.split(':');
	if (scheme !== 'scrypt' || !salt || !hash) throw new Error('AUTH_PASSWORD_HASH is malformed.');
	const expected = Buffer.from(hash, 'base64url');
	const derived = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {
		N: Number(N),
		r: Number(r),
		p: Number(p)
	});

	// The hash is always computed so a wrong username is not distinguishable by timing.
	const userOk = safeEqual(
		createHmac('sha256', 'u').update(username.trim().toLowerCase()).digest(),
		createHmac('sha256', 'u').update(expectedUser.trim().toLowerCase()).digest()
	);
	return safeEqual(derived, expected) && userOk;
}

function sign(payload: string): string {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSession(): string {
	const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_S * 1000 })).toString('base64url');
	return `${payload}.${sign(payload)}`;
}

export function isValidSession(token: string | undefined): boolean {
	if (!token) return false;
	const [payload, sig] = token.split('.');
	if (!payload || !sig) return false;
	if (!safeEqual(Buffer.from(sig), Buffer.from(sign(payload)))) return false;
	try {
		const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
		return typeof exp === 'number' && exp > Date.now();
	} catch {
		return false;
	}
}

// ---- login throttling (per client address) -----------------------------------

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function lockedFor(client: string): number {
	const entry = failures.get(client);
	if (!entry) return 0;
	if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
		failures.delete(client);
		return 0;
	}
	return Math.max(0, entry.lockedUntil - Date.now());
}

export function recordFailure(client: string): void {
	const entry = failures.get(client) ?? { count: 0, lockedUntil: 0 };
	entry.count += 1;
	if (entry.count >= MAX_FAILURES) entry.lockedUntil = Date.now() + LOCKOUT_MS;
	failures.set(client, entry);
}

export function recordSuccess(client: string): void {
	failures.delete(client);
}
