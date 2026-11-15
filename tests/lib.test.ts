import { describe, expect, it } from 'vitest';
import { computeTotals } from '../src/lib/money';
import { addDays, weekKey, weekKeysFrom, weekRange } from '../src/lib/dates';

describe('computeTotals', () => {
	it('applies tax and the pre-tax Pullbox discount', () => {
		const t = computeTotals(
			[
				{ priceCents: 399, copies: 2 },
				{ priceCents: 499, copies: 1 }
			],
			6
		);
		expect(t.subtotal).toBe(1297);
		expect(t.tax).toBe(78);
		expect(t.total).toBe(1375);
		expect(t.pullboxSubtotal).toBe(1167);
		expect(t.pullboxTax).toBe(70);
		expect(t.pullboxTotal).toBe(1237);
	});

	it('excludes unpriced items and counts them', () => {
		const t = computeTotals([{ priceCents: null, copies: 3 }], 6);
		expect(t.total).toBe(0);
		expect(t.unpriced).toBe(1);
	});
});

describe('weeks', () => {
	it('keys a week by its Wednesday, Sunday through Saturday', () => {
		expect(weekKey('2026-11-15')).toBe('2026-11-18'); // Sunday
		expect(weekKey('2026-11-18')).toBe('2026-11-18'); // Wednesday
		expect(weekKey('2026-11-21')).toBe('2026-11-18'); // Saturday
		expect(weekKey('2026-11-22')).toBe('2026-11-25'); // next Sunday
		expect(weekRange('2026-11-18')).toEqual({ start: '2026-11-15', end: '2026-11-21' });
	});

	it('lists consecutive weeks', () => {
		expect(weekKeysFrom('2026-11-13', 3)).toEqual(['2026-11-11', '2026-11-18', '2026-11-25']);
		expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
	});
});
