import { json, type RequestEvent } from '@sveltejs/kit';
import { MetronError } from './metron';
import { UserError } from './pulllist';

type Handler<E extends RequestEvent> = (event: E) => Promise<unknown> | unknown;

/** Wraps an API handler so domain errors become JSON responses with the right status. */
export function api<E extends RequestEvent>(handler: Handler<E>) {
	return async (event: E) => {
		try {
			return json((await handler(event)) ?? { ok: true });
		} catch (e) {
			if (e instanceof UserError || e instanceof MetronError) {
				return json({ error: e.message }, { status: e.status });
			}
			console.error(e);
			return json({ error: 'Unexpected server error.' }, { status: 500 });
		}
	};
}

export async function body(event: RequestEvent): Promise<Record<string, unknown>> {
	try {
		const data = await event.request.json();
		if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
	} catch {
		// fall through
	}
	throw new UserError('Invalid request body.');
}

export function intParam(value: unknown, name: string): number {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1) throw new UserError(`Invalid ${name}.`);
	return n;
}

export function variantParam(value: unknown): string | null {
	if (value == null) return null;
	if (typeof value !== 'string' || !/^v-[a-z0-9-]*$/.test(value)) throw new UserError('Invalid variant.');
	return value;
}
