import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { listPublishers } from '$lib/server/metron';
import { db, save } from '$lib/server/store';

const TTL_MS = 7 * 86_400_000;

export const GET: RequestHandler = api(async () => {
	const store = db();
	if (!store.publishers.items.length || Date.now() - store.publishers.fetchedAt > TTL_MS) {
		store.publishers = { fetchedAt: Date.now(), items: await listPublishers() };
		save();
	}
	return store.publishers.items;
});
