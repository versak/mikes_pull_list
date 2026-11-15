import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { updateSettings } from '$lib/server/pulllist';

export const PUT: RequestHandler = api(async (event) => updateSettings(await body(event)));
