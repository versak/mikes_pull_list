import type { RequestHandler } from './$types';
import { api, intParam } from '$lib/server/http';
import { getIssueView } from '$lib/server/pulllist';

export const GET: RequestHandler = api(({ params }) => getIssueView(intParam(params.id, 'issue')));
