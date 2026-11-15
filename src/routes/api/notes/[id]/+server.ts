import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { deleteNote, updateNote } from '$lib/server/pulllist';

export const PATCH: RequestHandler = api(async (event) => {
	const b = await body(event);
	updateNote(event.params.id, b.text);
});

export const DELETE: RequestHandler = api(({ params }) => {
	deleteNote(params.id);
});
