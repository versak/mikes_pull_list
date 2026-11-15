import type { RequestHandler } from './$types';
import { addDays, isDateString, todayLocal, weekKey } from '$lib/dates';
import { api, intParam } from '$lib/server/http';
import { searchIssues } from '$lib/server/metron';
import { annotateSearch, UserError } from '$lib/server/pulllist';
import type { SearchResponse } from '$lib/types';

export const GET: RequestHandler = api(async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const publisher = url.searchParams.get('publisher');
	const page = url.searchParams.get('page');
	const after = url.searchParams.get('after');
	const before = url.searchParams.get('before');

	if (after && !isDateString(after)) throw new UserError('Invalid start date.');
	if (before && !isDateString(before)) throw new UserError('Invalid end date.');

	const found = await searchIssues({
		query: q,
		publisherId: publisher ? intParam(publisher, 'publisher') : undefined,
		// Default to upcoming releases starting at the beginning of this week.
		after: after || addDays(weekKey(todayLocal()), -3),
		before: before || undefined,
		page: page ? intParam(page, 'page') : 1
	});

	const current = page ? intParam(page, 'page') : 1;
	return {
		results: annotateSearch(found.results),
		count: found.count,
		nextPage: found.hasNext ? current + 1 : null
	} satisfies SearchResponse;
});
