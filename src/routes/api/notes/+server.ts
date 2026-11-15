import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { addNote } from '$lib/server/pulllist';

export const POST: RequestHandler = api(async (event) => {
	const b = await body(event);
	return addNote(b.date, b.text);
});
