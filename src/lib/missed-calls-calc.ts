export const CALC_FIELDS = [
	'bookingValue',
	'missedCallsPerWeek',
	'bookRate',
	'repeatVisits',
] as const

export type CalcField = (typeof CALC_FIELDS)[number]

export interface MissedCallInputs {
	bookingValue: number
	missedCallsPerWeek: number
	bookRate: number
	repeatVisits: number
}

export interface MissedCallResult {
	annual: number
	monthly: number
	bookingsPerWeek: number
}

/** Default assumptions. Change the calculator defaults here. */
export const MISSED_CALL_DEFAULTS = {
	bookingValue: 500,
	missedCallsPerWeek: 10,
	bookRate: 30,
	repeatVisits: 1.2,
} as const satisfies MissedCallInputs

export const MISSED_CALL_LIMITS: Record<
	CalcField,
	{ min: number; max: number; step: number }
> = {
	bookingValue: { min: 0, max: 10_000, step: 1 },
	missedCallsPerWeek: { min: 0, max: 100, step: 1 },
	bookRate: { min: 0, max: 100, step: 1 },
	repeatVisits: { min: 1, max: 5, step: 0.1 },
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
})

function isField(value: string): value is CalcField {
	return (CALC_FIELDS as readonly string[]).includes(value)
}

/**
 * Normalises typed text for a specific field.
 *
 * Integer fields treat commas as thousands separators and drop every other
 * non-digit. Repeat visits are the only decimal field, so a comma is read as
 * a decimal point there instead.
 */
export function sanitizeNumericText(field: CalcField, raw: string): string {
	if (!isField(field)) return ''

	if (field === 'repeatVisits') {
		const digitsAndDots = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
		const [whole = '', ...fractionParts] = digitsAndDots.split('.')
		if (fractionParts.length === 0) return whole

		// The repeat slider moves in 0.1 steps, so the text field keeps one
		// decimal and never drifts away from the value it displays.
		return `${whole}.${fractionParts.join('').slice(0, 1)}`
	}

	return raw.replace(/,/g, '').replace(/[^0-9]/g, '')
}

/** Returns NaN when the text contains no usable number. */
export function parseNumericInput(field: CalcField, raw: string): number {
	const clean = sanitizeNumericText(field, raw)
	if (clean === '' || clean === '.') return Number.NaN

	return field === 'repeatVisits'
		? Number.parseFloat(clean)
		: Number.parseInt(clean, 10)
}

export function clampFieldValue(
	field: CalcField,
	value: number,
): number {
	const { min, max } = MISSED_CALL_LIMITS[field]
	const fallback = MISSED_CALL_DEFAULTS[field]

	if (!Number.isFinite(value)) return fallback
	return Math.min(max, Math.max(min, value))
}

export function calculateMissedCallRevenue(
	inputs: Partial<MissedCallInputs> = {},
): MissedCallResult {
	const bookingValue = clampFieldValue(
		'bookingValue',
		inputs.bookingValue ?? MISSED_CALL_DEFAULTS.bookingValue,
	)
	const missedCallsPerWeek = clampFieldValue(
		'missedCallsPerWeek',
		inputs.missedCallsPerWeek ?? MISSED_CALL_DEFAULTS.missedCallsPerWeek,
	)
	const bookRate = clampFieldValue(
		'bookRate',
		inputs.bookRate ?? MISSED_CALL_DEFAULTS.bookRate,
	)
	const repeatVisits = clampFieldValue(
		'repeatVisits',
		inputs.repeatVisits ?? MISSED_CALL_DEFAULTS.repeatVisits,
	)

	const bookingsPerWeek = missedCallsPerWeek * (bookRate / 100)
	const annual = bookingsPerWeek * bookingValue * repeatVisits * 52

	return {
		annual,
		monthly: annual / 12,
		bookingsPerWeek,
	}
}

export function formatCurrency(value: number): string {
	return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

/**
 * Picks the decimal precision for one bookings animation from its target.
 * Individual tween frames must reuse this value so the width never flickers.
 */
export function bookingsPrecision(value: number): 0 | 1 {
	if (!Number.isFinite(value)) return 0
	return Math.abs(value - Math.round(value)) < 1e-9 ? 0 : 1
}

export function formatBookings(
	value: number,
	digits: 0 | 1 = bookingsPrecision(value),
): string {
	const safe = Number.isFinite(value) ? value : 0
	const factor = 10 ** digits
	const rounded = Math.round(safe * factor) / factor

	return digits === 0 ? String(rounded) : rounded.toFixed(1)
}

export function formatRepeatVisits(value: number): string {
	const safe = Number.isFinite(value)
		? value
		: MISSED_CALL_DEFAULTS.repeatVisits
	const rounded = Math.round(safe * 10) / 10

	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatPercent(value: number): string {
	const safe = Number.isFinite(value) ? value : 0
	const rounded = Math.round(safe * 10) / 10

	return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)}%`
}

export function formatInputValue(field: CalcField, value: number): string {
	const safe = Number.isFinite(value) ? value : MISSED_CALL_DEFAULTS[field]

	return field === 'repeatVisits'
		? formatRepeatVisits(safe)
		: String(Math.round(safe))
}

/** Rounded only because this value feeds a CSS fill, never the revenue maths. */
export function percentOfRange(field: CalcField, value: number): number {
	const { min, max } = MISSED_CALL_LIMITS[field]
	if (max === min) return 0

	const clamped = clampFieldValue(field, value)
	const percent = ((clamped - min) / (max - min)) * 100
	return Math.round(percent * 1000) / 1000
}

export function buildAssumptionSummary(
	bookRate: number,
	repeatVisits: number,
): string {
	const rate = clampFieldValue('bookRate', bookRate)
	const repeats = clampFieldValue('repeatVisits', repeatVisits)

	return `Assuming ${formatPercent(rate)} of missed callers would book and an average of ${formatRepeatVisits(repeats)}x repeat visits.`
}

export function buildResultSummary(result: MissedCallResult): string {
	const bookings = formatBookings(result.bookingsPerWeek)
	const bookingWord = bookings === '1' ? 'booking' : 'bookings'

	return `Potential missed revenue ${formatCurrency(result.annual)} per year, ${formatCurrency(result.monthly)} per month, ${bookings} ${bookingWord} per week.`
}
