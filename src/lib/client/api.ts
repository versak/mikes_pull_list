export async function send<T = unknown>(method: string, url: string, payload?: unknown): Promise<T> {
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
			body: payload === undefined ? undefined : JSON.stringify(payload)
		});
	} catch {
		throw new Error('Could not reach the server.');
	}
	if (res.status === 401) {
		location.href = '/login';
		throw new Error('Signed out.');
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
	return data as T;
}
