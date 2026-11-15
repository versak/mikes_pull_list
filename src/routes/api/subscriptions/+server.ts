import type { RequestHandler } from './$types';
import { api, body, intParam } from '$lib/server/http';
import { subscribe } from '$lib/server/pulllist';

export const POST: RequestHandler = api(async (event) => {
	const b = await body(event);
	await subscribe(intParam(b.issueId, 'issue'));
});
