import { env } from '$env/dynamic/private';
import type { Publisher } from '$lib/types';
import type { IssueDetail, IssueRecord, VariantRecord } from './store';

const BASE_URL = 'https://metron.cloud/api';
// Metron allows at least 20 requests/minute; stay under it with a small burst allowance.
const BURST = 5;
const REFILL_MS = 3200;
const REQUEST_TIMEOUT_MS = 20_000;
const SEARCH_CACHE_MS = 10 * 60_000;
const SEARCH_CACHE_MAX = 200;

export type Priority = 'user' | 'background';

export class MetronError extends Error {
	constructor(
		message: string,
		readonly status = 502
	) {
		super(message);
	}
}

export function metronConfigured(): boolean {
	return Boolean(env.METRON_API_TOKEN);
}

interface Job {
	priority: Priority;
	run: () => Promise<void>;
}

let tokens = BURST;
let lastRefill = Date.now();
let pausedUntil = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const queue: Job[] = [];

function refill() {
	const now = Date.now();
	const gained = Math.floor((now - lastRefill) / REFILL_MS);
	if (gained > 0) {
		tokens = Math.min(BURST, tokens + gained);
		lastRefill += gained * REFILL_MS;
	}
}

function pump() {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	refill();
	while (queue.length) {
		const now = Date.now();
		if (now < pausedUntil) break;
		const userIdx = queue.findIndex((j) => j.priority === 'user');
		// Background work leaves one token spare so user actions are never starved.
		const idx = userIdx >= 0 ? userIdx : tokens >= 2 ? 0 : -1;
		if (idx < 0 || tokens < 1) break;
		tokens -= 1;
		const [job] = queue.splice(idx, 1);
		void job.run();
	}
	if (queue.length) {
		const untilToken = Math.max(0, lastRefill + REFILL_MS - Date.now());
		timer = setTimeout(pump, Math.max(untilToken, pausedUntil - Date.now(), 50));
	}
}

function schedule<T>(priority: Priority, task: () => Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		queue.push({
			priority,
			run: () => task().then(resolve, reject)
		});
		pump();
	});
}

async function request<T>(path: string, params: Record<string, string | number | undefined>, priority: Priority): Promise<T> {
	const token = env.METRON_API_TOKEN;
	if (!token) throw new MetronError('Metron API token is not configured (METRON_API_TOKEN in .env).', 503);

	const url = new URL(`${env.METRON_BASE_URL || BASE_URL}/${path}/`);
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
	}

	for (let attempt = 0; attempt < 3; attempt++) {
		const res = await schedule(priority, () =>
			fetch(url, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'mikes_pull_list/1.0' },
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			})
		).catch((e: unknown) => {
			throw new MetronError(`Could not reach Metron: ${e instanceof Error ? e.message : e}`);
		});

		if (res.status === 429) {
			const wait = Math.min(Number(res.headers.get('Retry-After')) || 30, 120);
			pausedUntil = Date.now() + wait * 1000;
			continue;
		}
		if (res.status === 401 || res.status === 403) {
			throw new MetronError('Metron rejected the API token. Check METRON_API_TOKEN in .env.', 502);
		}
		if (!res.ok) throw new MetronError(`Metron returned HTTP ${res.status}.`);
		return (await res.json()) as T;
	}
	throw new MetronError('Metron rate limit reached. Try again in a minute.', 429);
}

function safeImage(value: unknown): string | null {
	return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

function priceToCents(value: unknown): number | null {
	if (value == null || value === '') return null;
	const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
	return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

interface RawSeries {
	id: number;
	name: string;
	year_began?: number | null;
}
interface RawListIssue {
	id: number;
	series: RawSeries;
	number: string;
	store_date?: string | null;
	image?: string | null;
}
interface RawVariant {
	name?: string;
	price?: string | number | null;
	sku?: string;
	upc?: string;
	image?: string | null;
}
interface RawDetailIssue extends RawListIssue {
	publisher?: { id: number; name: string } | null;
	price?: string | number | null;
	name?: string[];
	variants?: RawVariant[];
}
interface Page<T> {
	count: number;
	next: string | null;
	results: T[];
}

function toRecord(raw: RawListIssue): Omit<IssueRecord, 'touchedAt'> {
	return {
		id: raw.id,
		seriesId: raw.series.id,
		seriesName: raw.series.name,
		seriesYear: raw.series.year_began ?? null,
		number: String(raw.number ?? ''),
		storeDate: raw.store_date ?? null,
		image: safeImage(raw.image)
	};
}

function variantKeys(raw: RawVariant[], fallbackPrice: number | null): VariantRecord[] {
	const seen = new Map<string, number>();
	return raw.map((v) => {
		const base =
			`v-${v.sku || v.upc || v.name || 'variant'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '') || 'v';
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		return {
			key: n === 1 ? base : `${base}-${n}`,
			name: v.name?.trim() || 'Variant cover',
			sku: v.sku ?? '',
			upc: v.upc ?? '',
			priceCents: priceToCents(v.price) ?? fallbackPrice,
			image: safeImage(v.image)
		};
	});
}

export type IssueBasic = Omit<IssueRecord, 'touchedAt' | 'detail'>;

export interface SearchParams {
	query?: string;
	publisherId?: number;
	after?: string;
	before?: string;
	page?: number;
}

const searchCache = new Map<string, { at: number; value: { results: IssueBasic[]; count: number; hasNext: boolean } }>();

export async function searchIssues(p: SearchParams) {
	const key = JSON.stringify(p);
	const hit = searchCache.get(key);
	if (hit && Date.now() - hit.at < SEARCH_CACHE_MS) return hit.value;

	const page = await request<Page<RawListIssue>>(
		'issue',
		{
			series_name: p.query?.trim(),
			publisher_id: p.publisherId,
			store_date_range_after: p.after,
			store_date_range_before: p.before,
			page: p.page && p.page > 1 ? p.page : undefined
		},
		'user'
	);
	const value = { results: page.results.map(toRecord), count: page.count, hasNext: Boolean(page.next) };
	if (searchCache.size >= SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value as string);
	searchCache.set(key, { at: Date.now(), value });
	return value;
}

/** Every issue of a series in a date range (follows pagination, capped). */
export async function listSeriesIssues(seriesId: number, after: string, before: string, priority: Priority): Promise<IssueBasic[]> {
	const out: IssueBasic[] = [];
	for (let page = 1; page <= 5; page++) {
		const res = await request<Page<RawListIssue>>(
			'issue',
			{ series_id: seriesId, store_date_range_after: after, store_date_range_before: before, page: page > 1 ? page : undefined },
			priority
		);
		out.push(...res.results.map(toRecord));
		if (!res.next) break;
	}
	return out;
}

export async function getIssueDetail(id: number, priority: Priority): Promise<IssueBasic & { detail: IssueDetail }> {
	const raw = await request<RawDetailIssue>(`issue/${id}`, {}, priority);
	const priceCents = priceToCents(raw.price);
	return {
		...toRecord(raw),
		detail: {
			publisher: raw.publisher?.name ?? null,
			priceCents,
			storyTitles: (raw.name ?? []).filter(Boolean),
			variants: variantKeys(raw.variants ?? [], priceCents),
			fetchedAt: Date.now()
		}
	};
}

export async function listPublishers(): Promise<Publisher[]> {
	const out: Publisher[] = [];
	for (let page = 1; page <= 10; page++) {
		const res = await request<Page<{ id: number; name: string }>>(
			'publisher',
			{ page: page > 1 ? page : undefined },
			'user'
		);
		out.push(...res.results.map((p) => ({ id: p.id, name: p.name })));
		if (!res.next) break;
	}
	return out.sort((a, b) => a.name.localeCompare(b.name));
}
