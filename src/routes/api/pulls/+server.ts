import type { RequestHandler } from './$types';
import { api, body, intParam, variantParam } from '$lib/server/http';
import { addPull, removePull, setPullCopies } from '$lib/server/pulllist';

export const POST: RequestHandler = api(async (event) => {
	const b = await body(event);
	await addPull(intParam(b.issueId, 'issue'), variantParam(b.variantKey));
});

export const PATCH: RequestHandler = api(async (event) => {
	const b = await body(event);
	setPullCopies(intParam(b.issueId, 'issue'), variantParam(b.variantKey), b.copies);
});

export const DELETE: RequestHandler = api(async (event) => {
	const b = await body(event);
	removePull(intParam(b.issueId, 'issue'), variantParam(b.variantKey));
});
