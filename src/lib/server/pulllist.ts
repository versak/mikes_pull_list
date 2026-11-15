import { addDays, daysBetween, isDateString, todayLocal, weekKey, weekKeysFrom, weekRange } from '$lib/dates';
import type {
	IssueDetailResponse,
	Note,
	PullItem,
	PullListData,
	SearchIssue,
	Settings,
	WeekView
} from '$lib/types';
import {
	getIssueDetail,
	listSeriesIssues,
	MetronError,
	metronConfigured,
	type IssueBasic
} from './metron';
import { db, save, type IssueRecord, type Pull } from './store';

export const FUTURE_WEEKS = 5; // this week + 4 future weeks
const RETENTION_DAYS = 30;
const MAX_COPIES = 99;
const DETAIL_TTL_MS = 3 * 86_400_000;
const PRUNE_AFTER_MS = 14 * 86_400_000;
const SUB_SYNC_MS = 6 * 3_600_000;
const BACKOFF_MS = 5 * 60_000;

export class UserError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

function clampCopies(n: unknown): number {
	const v = Math.trunc(Number(n));
	if (!Number.isFinite(v) || v < 1) throw new UserError('Copies must be at least 1.');
	return Math.min(v, MAX_COPIES);
}

// ---- issue records ----------------------------------------------------------

function upsertIssue(basic: IssueBasic, detail?: IssueRecord['detail']): IssueRecord {
	const store = db();
	const existing = store.issues[basic.id];
	const record: IssueRecord = {
		...basic,
		detail: detail ?? existing?.detail,
		touchedAt: Date.now()
	};
	store.issues[basic.id] = record;
	return record;
}

function isFresh(record: IssueRecord | undefined): record is IssueRecord & { detail: NonNullable<IssueRecord['detail']> } {
	return Boolean(record?.detail && Date.now() - record.detail.fetchedAt < DETAIL_TTL_MS);
}

async function ensureDetail(id: number): Promise<IssueRecord & { detail: NonNullable<IssueRecord['detail']> }> {
	const cached = db().issues[id];
	if (isFresh(cached)) {
		cached.touchedAt = Date.now();
		return cached;
	}
	const fetched = await getIssueDetail(id, 'user');
	const { detail, ...basic } = fetched;
	const record = upsertIssue(basic, detail) as IssueRecord & { detail: NonNullable<IssueRecord['detail']> };
	save();
	return record;
}

function toSearchIssue(basic: IssueBasic | IssueRecord): SearchIssue {
	const store = db();
	const record = store.issues[basic.id];
	const pull = store.pulls.find((p) => p.issueId === basic.id && p.variantKey === null);
	return {
		id: basic.id,
		seriesId: basic.seriesId,
		seriesName: basic.seriesName,
		seriesYear: basic.seriesYear,
		number: basic.number,
		storeDate: basic.storeDate,
		image: basic.image,
		publisher: record?.detail?.publisher ?? null,
		priceCents: record?.detail?.priceCents ?? null,
		pulledCopies: pull?.copies ?? 0,
		subscribed: store.subscriptions.some((s) => s.seriesId === basic.seriesId)
	};
}

export function annotateSearch(results: IssueBasic[]): SearchIssue[] {
	return results.map(toSearchIssue);
}

export async function getIssueView(id: number): Promise<IssueDetailResponse> {
	const record = await ensureDetail(id);
	const store = db();
	return {
		issue: toSearchIssue(record),
		storyTitles: record.detail.storyTitles,
		variants: record.detail.variants.map((v) => ({
			key: v.key,
			name: v.name,
			image: v.image,
			priceCents: v.priceCents,
			pulledCopies: store.pulls.find((p) => p.issueId === id && p.variantKey === v.key)?.copies ?? 0
		}))
	};
}

// ---- single pulls -----------------------------------------------------------

function findPull(issueId: number, variantKey: string | null): Pull | undefined {
	return db().pulls.find((p) => p.issueId === issueId && p.variantKey === variantKey);
}

export async function addPull(issueId: number, variantKey: string | null): Promise<void> {
	const record = await ensureDetail(issueId);
	if (!record.storeDate) throw new UserError('This issue has no release date yet.');
	if (variantKey !== null && !record.detail.variants.some((v) => v.key === variantKey)) {
		throw new UserError('Unknown variant.', 404);
	}
	const existing = findPull(issueId, variantKey);
	if (existing) existing.copies = Math.min(existing.copies + 1, MAX_COPIES);
	else db().pulls.push({ issueId, variantKey, copies: 1, pulledAt: Date.now() });
	save();
	kickBackground();
}

export function setPullCopies(issueId: number, variantKey: string | null, copies: unknown): void {
	const pull = findPull(issueId, variantKey);
	if (!pull) throw new UserError('Pull not found.', 404);
	pull.copies = clampCopies(copies);
	save();
}

export function removePull(issueId: number, variantKey: string | null): void {
	const store = db();
	store.pulls = store.pulls.filter((p) => !(p.issueId === issueId && p.variantKey === variantKey));
	save();
}

// ---- subscriptions ----------------------------------------------------------

function syncWindow(today: string): { after: string; before: string } {
	const keys = weekKeysFrom(today, FUTURE_WEEKS);
	return { after: weekRange(keys[0]).start, before: weekRange(keys[keys.length - 1]).end };
}

async function syncSeries(seriesId: number, priority: 'user' | 'background'): Promise<void> {
	const store = db();
	const { after, before } = syncWindow(todayLocal());
	const fetched = await listSeriesIssues(seriesId, after, before, priority);
	const fetchedIds = new Set(fetched.map((i) => i.id));
	for (const basic of fetched) upsertIssue(basic);

	store.subIssues = store.subIssues.filter((s) => {
		if (s.seriesId !== seriesId || fetchedIds.has(s.issueId)) return true;
		const date = store.issues[s.issueId]?.storeDate;
		return !date || date < after || date > before;
	});
	const known = new Set(store.subIssues.map((s) => s.issueId));
	for (const basic of fetched) {
		if (basic.storeDate && !known.has(basic.id)) store.subIssues.push({ issueId: basic.id, seriesId });
	}
	save();
}

export async function subscribe(issueId: number): Promise<void> {
	const record = await ensureDetail(issueId);
	const store = db();
	if (!store.subscriptions.some((s) => s.seriesId === record.seriesId)) {
		store.subscriptions.push({
			seriesId: record.seriesId,
			seriesName: record.seriesName,
			seriesYear: record.seriesYear,
			publisher: record.detail.publisher,
			copies: 1,
			subscribedAt: Date.now()
		});
		save();
	}
	await syncSeries(record.seriesId, 'user');
	kickBackground();
}

export function setSubscriptionCopies(seriesId: number, copies: unknown): void {
	const sub = db().subscriptions.find((s) => s.seriesId === seriesId);
	if (!sub) throw new UserError('Subscription not found.', 404);
	sub.copies = clampCopies(copies);
	save();
}

/** Removes the subscription and every release from today onward; earlier releases stay until they expire. */
export function unsubscribe(seriesId: number): void {
	const store = db();
	const today = todayLocal();
	store.subscriptions = store.subscriptions.filter((s) => s.seriesId !== seriesId);
	store.subIssues = store.subIssues.filter((s) => {
		if (s.seriesId !== seriesId) return true;
		const date = store.issues[s.issueId]?.storeDate;
		return Boolean(date && date < today);
	});
	save();
}

// ---- pull list view ---------------------------------------------------------

/** Sort key for a series name: a leading "The" is ignored. */
function sortTitle(name: string): string {
	return name.trim().replace(/^the\s+/i, '');
}

function compareItems(a: PullItem, b: PullItem): number {
	return (
		sortTitle(a.seriesName).localeCompare(sortTitle(b.seriesName), undefined, { sensitivity: 'base' }) ||
		a.seriesName.localeCompare(b.seriesName) ||
		(a.seriesYear ?? 0) - (b.seriesYear ?? 0) ||
		(a.storeDate ?? '').localeCompare(b.storeDate ?? '') ||
		a.number.localeCompare(b.number, undefined, { numeric: true }) ||
		(a.variantName ?? '').localeCompare(b.variantName ?? '')
	);
}

function buildItems(): Map<string, PullItem[]> {
	const store = db();
	const byWeek = new Map<string, PullItem[]>();
	const push = (item: PullItem) => {
		if (!item.storeDate) return;
		const k = weekKey(item.storeDate);
		const list = byWeek.get(k) ?? [];
		list.push(item);
		byWeek.set(k, list);
	};

	for (const pull of store.pulls) {
		const rec = store.issues[pull.issueId];
		if (!rec) continue;
		const variant = pull.variantKey ? rec.detail?.variants.find((v) => v.key === pull.variantKey) : undefined;
		push({
			key: `pull:${pull.issueId}:${pull.variantKey ?? 'main'}`,
			source: 'single',
			issueId: rec.id,
			seriesId: rec.seriesId,
			seriesName: rec.seriesName,
			seriesYear: rec.seriesYear,
			number: rec.number,
			storyTitles: rec.detail?.storyTitles ?? [],
			publisher: rec.detail?.publisher ?? null,
			priceCents: variant ? variant.priceCents : (rec.detail?.priceCents ?? null),
			storeDate: rec.storeDate,
			image: variant?.image ?? rec.image,
			copies: pull.copies,
			variantKey: pull.variantKey,
			variantName: variant?.name ?? null,
			pending: !rec.detail
		});
	}

	for (const si of store.subIssues) {
		const rec = store.issues[si.issueId];
		const sub = store.subscriptions.find((s) => s.seriesId === si.seriesId);
		if (!rec || !sub) continue;
		push({
			key: `sub:${rec.id}`,
			source: 'subscription',
			issueId: rec.id,
			seriesId: rec.seriesId,
			seriesName: rec.seriesName,
			seriesYear: rec.seriesYear,
			number: rec.number,
			storyTitles: rec.detail?.storyTitles ?? [],
			publisher: rec.detail?.publisher ?? sub.publisher,
			priceCents: rec.detail?.priceCents ?? null,
			storeDate: rec.storeDate,
			image: rec.image,
			copies: sub.copies,
			variantKey: null,
			variantName: null,
			pending: !rec.detail
		});
	}

	for (const list of byWeek.values()) list.sort(compareItems);
	return byWeek;
}

export function getPullList(): PullListData {
	purgeExpired();
	const store = db();
	const today = todayLocal();
	const byWeek = buildItems();
	const notesByWeek = new Map<string, Note[]>();
	for (const n of store.notes) {
		const list = notesByWeek.get(n.weekKey) ?? [];
		list.push(n);
		notesByWeek.set(n.weekKey, list);
	}

	const currentKey = weekKey(today);
	const view = (key: string): WeekView => ({
		key,
		...weekRange(key),
		isCurrent: key === currentKey,
		isPast: key < currentKey,
		items: byWeek.get(key) ?? [],
		notes: (notesByWeek.get(key) ?? []).sort((a, b) => a.createdAt - b.createdAt)
	});

	const horizon = weekKeysFrom(today, FUTURE_WEEKS);
	const lastHorizon = horizon[horizon.length - 1];
	const later = [...byWeek.keys(), ...notesByWeek.keys()].filter((k) => k > lastHorizon);
	const futureKeys = [...horizon, ...later.sort()].filter((k, i, a) => a.indexOf(k) === i);

	const pastKeys = [...byWeek.keys(), ...notesByWeek.keys()]
		.filter((k) => k < currentKey && daysBetween(k, today) <= RETENTION_DAYS + 7)
		.filter((k, i, a) => a.indexOf(k) === i)
		.sort()
		.reverse();

	kickBackground();

	return {
		weeks: futureKeys.map(view),
		pastWeeks: pastKeys.map(view),
		settings: store.settings,
		today,
		metronConfigured: metronConfigured()
	};
}

// ---- notes & settings -------------------------------------------------------

function cleanNoteText(text: unknown): string {
	const t = typeof text === 'string' ? text.trim() : '';
	if (!t) throw new UserError('Note cannot be empty.');
	if (t.length > 2000) throw new UserError('Note is too long (2000 characters max).');
	return t;
}

export function addNote(date: unknown, text: unknown): Note {
	if (!isDateString(date)) throw new UserError('Invalid date.');
	const note: Note = {
		id: crypto.randomUUID(),
		weekKey: weekKey(date),
		text: cleanNoteText(text),
		createdAt: Date.now()
	};
	db().notes.push(note);
	save();
	return note;
}

export function updateNote(id: string, text: unknown): void {
	const note = db().notes.find((n) => n.id === id);
	if (!note) throw new UserError('Note not found.', 404);
	note.text = cleanNoteText(text);
	save();
}

export function deleteNote(id: string): void {
	const store = db();
	store.notes = store.notes.filter((n) => n.id !== id);
	save();
}

export function getNotes(): Note[] {
	return [...db().notes].sort((a, b) => a.weekKey.localeCompare(b.weekKey) || a.createdAt - b.createdAt);
}

export function getSettings(): Settings {
	return db().settings;
}

export function updateSettings(input: { taxRate?: unknown }): Settings {
	const store = db();
	if (input.taxRate !== undefined) {
		const rate = Number(input.taxRate);
		if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new UserError('Tax rate must be between 0 and 100.');
		store.settings.taxRate = Math.round(rate * 1000) / 1000;
	}
	save();
	return store.settings;
}

// ---- retention --------------------------------------------------------------

let lastPurge = 0;

/** Drops pulls and subscription releases more than a month past their release date. */
export function purgeExpired(): void {
	if (Date.now() - lastPurge < 3_600_000) return;
	lastPurge = Date.now();
	const store = db();
	const cutoff = addDays(todayLocal(), -RETENTION_DAYS);
	const expired = (id: number) => {
		const date = store.issues[id]?.storeDate;
		return !date || date < cutoff;
	};
	const before = store.pulls.length + store.subIssues.length;
	store.pulls = store.pulls.filter((p) => !expired(p.issueId));
	store.subIssues = store.subIssues.filter((s) => !expired(s.issueId));

	const referenced = new Set([...store.pulls.map((p) => p.issueId), ...store.subIssues.map((s) => s.issueId)]);
	let pruned = 0;
	for (const [id, rec] of Object.entries(store.issues)) {
		if (!referenced.has(Number(id)) && Date.now() - rec.touchedAt > PRUNE_AFTER_MS) {
			delete store.issues[id];
			pruned++;
		}
	}
	if (pruned || before !== store.pulls.length + store.subIssues.length) save();
}

// ---- background sync --------------------------------------------------------

let running = false;
let backoffUntil = 0;

function nextUnhydrated(): number | null {
	const store = db();
	const today = todayLocal();
	const ids = new Set([...store.pulls.map((p) => p.issueId), ...store.subIssues.map((s) => s.issueId)]);
	let stale: number | null = null;
	for (const id of ids) {
		const rec = store.issues[id];
		if (!rec) continue;
		if (!rec.detail) return id;
		const upcoming = !rec.storeDate || rec.storeDate >= today;
		if (upcoming && Date.now() - rec.detail.fetchedAt > DETAIL_TTL_MS) stale ??= id;
	}
	return stale;
}

/** Fire-and-forget: refreshes subscriptions and fills in publisher/price for pulled issues at a gentle pace. */
export function kickBackground(): void {
	if (running || !metronConfigured() || Date.now() < backoffUntil) return;
	running = true;
	void (async () => {
		try {
			const store = db();
			if (store.subscriptions.length && Date.now() - store.lastSubscriptionSync > SUB_SYNC_MS) {
				for (const sub of [...store.subscriptions]) await syncSeries(sub.seriesId, 'background');
				store.lastSubscriptionSync = Date.now();
				save();
			}
			for (let id = nextUnhydrated(); id !== null; id = nextUnhydrated()) {
				const { detail, ...basic } = await getIssueDetail(id, 'background');
				upsertIssue(basic, detail);
				save();
			}
		} catch (e) {
			if (e instanceof MetronError) backoffUntil = Date.now() + BACKOFF_MS;
			else console.error('background sync failed', e);
		} finally {
			running = false;
		}
	})();
}
