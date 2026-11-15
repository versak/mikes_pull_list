import { json, redirect, type Handle } from '@sveltejs/kit';
import { isValidSession, SESSION_COOKIE } from '$lib/server/auth';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isApi = pathname.startsWith('/api/');

	// Origin must match the host the browser asked for; SvelteKit's own check would require ORIGIN to be set.
	if (!SAFE_METHODS.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('x-forwarded-host') ?? event.request.headers.get('host');
		let sameOrigin = false;
		try {
			sameOrigin = origin !== null && host !== null && new URL(origin).host === host;
		} catch {
			// malformed Origin header
		}
		if (!sameOrigin) {
			return isApi ? json({ error: 'Cross-origin request blocked.' }, { status: 403 }) : new Response('Forbidden', { status: 403 });
		}
	}

	const authed = isValidSession(event.cookies.get(SESSION_COOKIE));
	event.locals.authed = authed;

	if (!authed && pathname !== '/login') {
		if (isApi) return json({ error: 'Not signed in.' }, { status: 401 });
		redirect(303, '/login');
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'same-origin');
	if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'no-store');
	return response;
};
