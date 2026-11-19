import { describe, expect, it } from 'vitest';
import { calculator as copy } from '../../../content/site/site.json';
import { formatCopy } from '../tina/site-model';

import {
	bookingsPrecision,
	buildAssumptionSummary,
	buildResultSummary,
	calculateMissedCallRevenue,
	clampFieldValue,
	formatBookings,
	formatCurrency,
	formatInputValue,
	formatPercent,
	formatRepeatVisits,
	MISSED_CALL_DEFAULTS,
	parseNumericInput,
	percentOfRange,
	sanitizeNumericText,
} from '../missed-calls-calc';

describe('missed-calls calculator', () => {
	it('turns the defaults into the documented annual and monthly values', () => {
		const result = calculateMissedCallRevenue();

		expect(result.bookingsPerWeek).toBe(3);
		expect(result.annual).toBeCloseTo(93_600, 6);
		expect(result.monthly).toBeCloseTo(7_800, 6);
		expect(formatCurrency(result.annual)).toBe('$93,600');
		expect(formatCurrency(result.monthly)).toBe('$7,800');
		expect(formatBookings(result.bookingsPerWeek)).toBe('3');
	});

	it('keeps raw values unrounded for display', () => {
		const result = calculateMissedCallRevenue({
			...MISSED_CALL_DEFAULTS,
			bookingValue: 499,
		});

		expect(result.annual).toBeCloseTo(93_412.8, 6);
		expect(result.monthly).toBeCloseTo(7_784.4, 6);
		// Only presentation rounds.
		expect(formatCurrency(result.annual)).toBe('$93,413');
	});

	it('handles all-zero inputs', () => {
		const result = calculateMissedCallRevenue({
			bookingValue: 0,
			missedCallsPerWeek: 0,
			bookRate: 0,
			repeatVisits: 0,
		});

		// Repeat visits clamps to 1, but the other zeros keep the result at zero.
		expect(result).toEqual({
			annual: 0,
			monthly: 0,
			bookingsPerWeek: 0,
		});
	});

	it('clamps every field to its documented range', () => {
		const high = calculateMissedCallRevenue({
			bookingValue: 20_000,
			missedCallsPerWeek: 200,
			bookRate: 200,
			repeatVisits: 9,
		});

		expect(high.bookingsPerWeek).toBe(100);
		expect(high.annual).toBe(260_000_000);

		const low = calculateMissedCallRevenue({
			bookingValue: -10,
			missedCallsPerWeek: -2,
			bookRate: -5,
			repeatVisits: 0,
		});

		expect(low).toEqual({
			annual: 0,
			monthly: 0,
			bookingsPerWeek: 0,
		});
	});

	it('falls back to defaults for non-finite values', () => {
		const result = calculateMissedCallRevenue({
			bookingValue: Number.NaN,
			missedCallsPerWeek: Number.POSITIVE_INFINITY,
		});

		expect(result.annual).toBeCloseTo(93_600, 6);
		expect(clampFieldValue('bookingValue', Number.NaN)).toBe(500);
	});

	it('parses commas as thousands separators on integer fields', () => {
		expect(parseNumericInput('bookingValue', '1,500')).toBe(1500);
		expect(parseNumericInput('missedCallsPerWeek', '1,500')).toBe(1500);
		expect(parseNumericInput('bookRate', '1,500')).toBe(1500);
		expect(parseNumericInput('bookingValue', '$1,500')).toBe(1500);
		expect(parseNumericInput('missedCallsPerWeek', '10 calls')).toBe(10);
		expect(parseNumericInput('bookRate', '30%')).toBe(30);
	});

	it('normalises a comma to a decimal point for repeat visits', () => {
		expect(parseNumericInput('repeatVisits', '1,5')).toBe(1.5);
		expect(parseNumericInput('repeatVisits', '1,5x')).toBe(1.5);
		expect(sanitizeNumericText('repeatVisits', '1,5')).toBe('1.5');
		// The paired slider steps in 0.1, so the text field keeps one decimal.
		expect(parseNumericInput('repeatVisits', '1.25')).toBe(1.2);
		expect(sanitizeNumericText('bookingValue', '1,500')).toBe('1500');
	});

	it('returns NaN when a field has no numeric text', () => {
		expect(parseNumericInput('bookingValue', 'abc')).toBeNaN();
		expect(parseNumericInput('bookRate', '$ %')).toBeNaN();
		expect(parseNumericInput('repeatVisits', '')).toBeNaN();
	});

	it('picks one bookings precision per target', () => {
		expect(bookingsPrecision(3)).toBe(0);
		expect(bookingsPrecision(3.5)).toBe(1);
		expect(formatBookings(3, 0)).toBe('3');
		expect(formatBookings(3, 1)).toBe('3.0');
		expect(formatBookings(3.5, 1)).toBe('3.5');
		expect(formatBookings(3.04, 0)).toBe('3');
	});

	it('formats repeat visits and percentages without floating noise', () => {
		expect(formatRepeatVisits(1.2)).toBe('1.2');
		expect(formatRepeatVisits(2)).toBe('2');
		expect(formatPercent(30)).toBe('30%');
		expect(formatPercent(30.5)).toBe('30.5%');
		expect(formatInputValue('repeatVisits', 1.2)).toBe('1.2');
		expect(formatInputValue('bookingValue', 500)).toBe('500');
	});

	it('maps values onto slider percentages, including the repeat range', () => {
		expect(percentOfRange('missedCallsPerWeek', 10)).toBe(10);
		expect(percentOfRange('bookRate', 30)).toBe(30);
		expect(percentOfRange('repeatVisits', 1.2)).toBe(5);
		expect(percentOfRange('repeatVisits', 3)).toBe(50);
	});

	it('builds the collapsed helper and settled status copy', () => {
		expect(buildAssumptionSummary(30, 1.2)).toBe(
			formatCopy(copy.assumption, { rate: formatPercent(30), repeats: '1.2' }),
		);

		expect(buildResultSummary(calculateMissedCallRevenue())).toBe(
			formatCopy(copy.result, { annual: formatCurrency(93600), monthly: formatCurrency(7800), bookings: '3', bookingWord: copy.bookingPlural }),
		);
	});

	it('uses edited templates, units and singular labels without changing the maths', () => {
		const edited = { ...copy, currency: 'USD ', percent: ' percent',
			assumption: '{repeats} repeat, {rate} conversion',
			result: '{bookings} {bookingWord}: {annual} / {monthly}',
			bookingSingular: 'appointment', bookingPlural: 'appointments' };
		expect(buildAssumptionSummary(30, 1.2, edited)).toBe('1.2 repeat, 30 percent conversion');
		expect(buildResultSummary(calculateMissedCallRevenue({ missedCallsPerWeek: 1, bookRate: 100 }), edited))
			.toBe('1 appointment: USD 31,200 / USD 2,600');
		expect(buildResultSummary(calculateMissedCallRevenue(), edited))
			.toBe('3 appointments: USD 93,600 / USD 7,800');
	});
});
