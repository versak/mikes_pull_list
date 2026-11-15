const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as UTC midnight so day arithmetic is immune to time zones and DST. */
function parse(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

export function isDateString(value: unknown): value is string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value));
}

export function todayLocal(now = new Date()): string {
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
	return format(parse(date) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
	return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/** Weeks run Sunday to Saturday and are identified by their Wednesday, the new comic book day. */
export function weekKey(date: string): string {
	const dow = new Date(parse(date)).getUTCDay();
	return addDays(date, 3 - dow);
}

export function weekRange(key: string): { start: string; end: string } {
	return { start: addDays(key, -3), end: addDays(key, 3) };
}

export function weekKeysFrom(date: string, count: number): string[] {
	const first = weekKey(date);
	return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
		...opts
	}).format(new Date(parse(date)));
}
