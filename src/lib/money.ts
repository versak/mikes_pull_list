/** Pullbox takes this fraction off the pre-tax subtotal. */
export const PULLBOX_DISCOUNT = 0.1;

export interface Totals {
	subtotal: number;
	tax: number;
	total: number;
	pullboxSubtotal: number;
	pullboxTax: number;
	pullboxTotal: number;
	/** Items whose price is not known yet and are excluded from the totals. */
	unpriced: number;
}

export function formatMoney(cents: number | null): string {
	if (cents == null) return '—';
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/** All amounts are integer cents; tax is rounded per total. */
export function computeTotals(
	items: { priceCents: number | null; copies: number }[],
	taxRatePercent: number
): Totals {
	let subtotal = 0;
	let unpriced = 0;
	for (const item of items) {
		if (item.priceCents == null) unpriced += 1;
		else subtotal += item.priceCents * item.copies;
	}
	const rate = taxRatePercent / 100;
	const tax = Math.round(subtotal * rate);
	const pullboxSubtotal = Math.round(subtotal * (1 - PULLBOX_DISCOUNT));
	const pullboxTax = Math.round(pullboxSubtotal * rate);
	return {
		subtotal,
		tax,
		total: subtotal + tax,
		pullboxSubtotal,
		pullboxTax,
		pullboxTotal: pullboxSubtotal + pullboxTax,
		unpriced
	};
}
