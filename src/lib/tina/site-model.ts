import seed from '../../../content/site/site.json'
import { templateTokens } from './template-tokens'

export type SiteContent = typeof seed
export const planIds = ['basic', 'pro', 'plus', 'max'] as const
export type PlanId = typeof planIds[number]
const positiveNumbers = new Set([
	'monthly', 'annualTotal', 'minutes', 'concurrentCalls', 'phoneNumbers',
	'demoFreeMinutes', 'demoDeliveryHours',
	'benchmarkAnnualWage',
])
const integerNumbers = new Set([
	'minutes', 'concurrentCalls', 'phoneNumbers', 'demoFreeMinutes',
	'benchmarkYear',
])
const moneyPrecision: Record<string, number> = {
	monthly: 2, annualTotal: 2, setupFee: 2, additionalPhoneNumberMonthly: 2,
	overagePerMinute: 2, smsPerMessage: 2, liveTransferPerMinute: 2,
	telephonyFromPerMinute: 3, benchmarkAnnualWage: 2,
}
export const benefitTokens = ['minutes', 'concurrentCalls', 'phoneNumbers', 'proName'] as const

export function fillTokens(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{([^{}]+)\}/g, (_match, key: string) => {
		if (!Object.hasOwn(values, key)) throw new Error(`Unknown copy token: ${key}`)
		return String(values[key])
	})
}
export const formatCopy = fillTokens

export function linkUrlError(actual: unknown, key: string): string | undefined {
	if (typeof actual !== 'string' || !actual) return 'A link URL is required.'
	let safe = !/[\s\u0000-\u001f\u007f-\u009f\\]/u.test(actual)
		&& !/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(actual)
	if (actual.startsWith('/')) safe &&= !actual.startsWith('//')
	else if (actual.startsWith('#')) safe &&= actual.length > 1
	else if (key === 'email' && actual.startsWith('mailto:')) {
		safe &&= /^mailto:[^@/?#:%]+@[^@/?#:%]+$/u.test(actual)
	} else {
		try {
			const url = new URL(actual)
			safe &&= actual.startsWith('https://') && url.protocol === 'https:'
				&& !!url.hostname && !url.username && !url.password
		} catch { safe = false }
	}
	if (!safe) return 'Use a safe root-relative path, nonempty #fragment, or HTTPS URL without credentials or whitespace.'
}

export function validateSite(value: unknown): asserts value is SiteContent {
	function visit(actual: unknown, expected: unknown, path: string) {
		if (typeof expected === 'string') {
			if (typeof actual !== 'string' || !actual.trim()) throw new Error(`Missing text: ${path}`)
			if (path.startsWith('site.links.')) {
				const error = linkUrlError(actual, path.slice('site.links.'.length))
				if (error) throw new Error(`Invalid link URL: ${path}: ${error}`)
			}
			const tokens = templateTokens[path.replace(/^site\./, '')] ?? []
			const actualTokens = [...actual.matchAll(/\{([^{}]+)\}/g)].map(match => match[1])
			if (tokens.some(token => !actualTokens.includes(token)) || actualTokens.some(token => !tokens.includes(token))) {
				throw new Error(`Preserve the supported placeholders in ${path}: ${tokens.join(', ')}`)
			}
		} else if (typeof expected === 'number') {
			const key = path.split('.').at(-1)!
			if (typeof actual !== 'number' || !Number.isFinite(actual)
				|| actual < 0 || (positiveNumbers.has(key) && actual <= 0)
				|| (integerNumbers.has(key) && !Number.isInteger(actual))) {
				throw new Error(`Invalid number: ${path}`)
			}
			const precision = moneyPrecision[key]
			if (precision !== undefined && Math.abs(actual * 10 ** precision - Math.round(actual * 10 ** precision)) > 1e-7) {
				throw new Error(`${path} supports at most ${precision} decimal places`)
			}
		} else if (typeof expected === 'boolean') {
			if (typeof actual !== 'boolean') throw new Error(`Invalid allowance: ${path}`)
			if (path.endsWith('.recommended') && actual !== expected) throw new Error(`Fixed styling setting changed: ${path}`)
		} else {
			if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error(`Invalid object: ${path}`)
			for (const [key, child] of Object.entries(expected as object)) {
				visit((actual as Record<string, unknown>)[key], child, `${path}.${key}`)
			}
		}
	}
	visit(value, seed, 'site')
	const site = value as SiteContent
	if (Math.round(site.pricing.benchmarkAnnualWage / 12) <= 0) throw new Error('Wage benchmark must have a positive rounded monthly amount')
	for (const id of planIds) {
		const plan = site.pricing.plans[id]
		if (plan.annualTotal > plan.monthly * 12) throw new Error(`Annual charge exceeds monthly billing: ${id}`)
	}
	fillTokens(site.offer.deliveryTemplate, { hours: 1, hourUnit: 'hour' })
}
