export interface Settings {
	/** Sales tax as a percentage, e.g. 6 for 6%. */
	taxRate: number;
}

export const DEFAULT_SETTINGS: Settings = { taxRate: 6 };

export interface Note {
	id: string;
	weekKey: string;
	text: string;
	createdAt: number;
}

/** A single card on a weekly pull list. */
export interface PullItem {
	/** Unique within a week: `pull:<issueId>:<variantKey|main>` or `sub:<issueId>`. */
	key: string;
	source: 'single' | 'subscription';
	issueId: number;
	seriesId: number;
	seriesName: string;
	seriesYear: number | null;
	number: string;
	storyTitles: string[];
	publisher: string | null;
	priceCents: number | null;
	storeDate: string | null;
	image: string | null;
	copies: number;
	/** null for the main cover. */
	variantKey: string | null;
	variantName: string | null;
	/** True while issue details (publisher/price) are still being fetched. */
	pending: boolean;
}

export interface WeekView {
	/** The Wednesday (new comic book day) of the week, YYYY-MM-DD. */
	key: string;
	start: string;
	end: string;
	isCurrent: boolean;
	isPast: boolean;
	items: PullItem[];
	notes: Note[];
}

export interface PullListData {
	weeks: WeekView[];
	pastWeeks: WeekView[];
	settings: Settings;
	today: string;
	metronConfigured: boolean;
}

/** An issue as shown in search results. */
export interface SearchIssue {
	id: number;
	seriesId: number;
	seriesName: string;
	seriesYear: number | null;
	number: string;
	storeDate: string | null;
	image: string | null;
	publisher: string | null;
	priceCents: number | null;
	/** Copies already pulled as a single issue (main cover). */
	pulledCopies: number;
	subscribed: boolean;
}

export interface SearchResponse {
	results: SearchIssue[];
	count: number;
	nextPage: number | null;
}

export interface VariantView {
	key: string;
	name: string;
	image: string | null;
	priceCents: number | null;
	pulledCopies: number;
}

export interface IssueDetailResponse {
	issue: SearchIssue;
	storyTitles: string[];
	variants: VariantView[];
}

export interface Publisher {
	id: number;
	name: string;
}
