import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSession,
	lockedFor,
	recordFailure,
	recordSuccess,
	SESSION_COOKIE,
	SESSION_MAX_AGE_S,
	verifyCredentials
} from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.authed) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const client = getClientAddress();
		const wait = lockedFor(client);
		if (wait > 0) {
			return fail(429, { error: `Too many attempts. Try again in ${Math.ceil(wait / 60_000)} minute(s).`, username: '' });
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');

		let ok = false;
		try {
			ok = await verifyCredentials(username, password);
		} catch (e) {
			console.error(e instanceof Error ? e.message : e);
			return fail(500, { error: 'Server login is not configured.', username: '' });
		}

		if (!ok) {
			recordFailure(client);
			return fail(401, { error: 'Invalid username or password.', username });
		}

		recordSuccess(client);
		cookies.set(SESSION_COOKIE, createSession(), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: (request.headers.get('origin') ?? '').startsWith('https://'),
			maxAge: SESSION_MAX_AGE_S
		});
		redirect(303, '/');
	}
};
