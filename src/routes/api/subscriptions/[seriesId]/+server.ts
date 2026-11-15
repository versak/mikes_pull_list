import type { RequestHandler } from './$types';
import { api, body, intParam } from '$lib/server/http';
import { setSubscriptionCopies, unsubscribe } from '$lib/server/pulllist';

export const PATCH: RequestHandler = api(async (event) => {
	const b = await body(event);
	setSubscriptionCopies(intParam(event.params.seriesId, 'series'), b.copies);
});

export const DELETE: RequestHandler = api(({ params }) => {
	unsubscribe(intParam(params.seriesId, 'series'));
});
