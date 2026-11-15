import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { DEFAULT_SETTINGS, type Note, type Publisher, type Settings } from '$lib/types';

export interface VariantRecord {
	key: string;
	name: string;
	sku: string;
	upc: string;
	priceCents: number | null;
	image: string | null;
}

export interface IssueDetail {
	publisher: string | null;
	priceCents: number | null;
	storyTitles: string[];
	variants: VariantRecord[];
	fetchedAt: number;
}

export interface IssueRecord {
	id: number;
	seriesId: number;
	seriesName: string;
	seriesYear: number | null;
	number: string;
	storeDate: string | null;
	image: string | null;
	detail?: IssueDetail;
	/** Last time anything referenced or viewed this record; used for pruning. */
	touchedAt: number;
}

/** A single issue (main cover or variant) pulled on its own. */
export interface Pull {
	issueId: number;
	/** null for the main cover. */
	variantKey: string | null;
	copies: number;
	pulledAt: number;
}

export interface Subscription {
	seriesId: number;
	seriesName: string;
	seriesYear: number | null;
	publisher: string | null;
	copies: number;
	subscribedAt: number;
}

/** An issue of a subscribed series that landed on a weekly list. */
export interface SubIssue {
	issueId: number;
	seriesId: number;
}

export interface StoreData {
	version: 1;
	settings: Settings;
	issues: Record<string, IssueRecord>;
	pulls: Pull[];
	subscriptions: Subscription[];
	subIssues: SubIssue[];
	notes: Note[];
	publishers: { fetchedAt: number; items: Publisher[] };
	lastSubscriptionSync: number;
}

function emptyStore(): StoreData {
	return {
		version: 1,
		settings: { ...DEFAULT_SETTINGS },
		issues: {},
		pulls: [],
		subscriptions: [],
		subIssues: [],
		notes: [],
		publishers: { fetchedAt: 0, items: [] },
		lastSubscriptionSync: 0
	};
}

let data: StoreData | null = null;
let filePath: string | null = null;

function path(): string {
	filePath ??= resolve(env.DATA_DIR || 'data', 'store.json');
	return filePath;
}

export function db(): StoreData {
	if (data) return data;
	const file = path();
	if (existsSync(file)) {
		const loaded = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoreData>;
		data = { ...emptyStore(), ...loaded, settings: { ...DEFAULT_SETTINGS, ...loaded.settings } };
	} else {
		data = emptyStore();
	}
	return data;
}

/** Writes atomically so a crash mid-write cannot corrupt the store. */
export function save(): void {
	const file = path();
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	writeFileSync(tmp, JSON.stringify(db()), 'utf8');
	renameSync(tmp, file);
}
