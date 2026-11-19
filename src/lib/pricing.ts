import seed from '../../content/site/site.json'
import { fillTokens, planIds, type SiteContent } from './tina/site-model'

export function getPlans(pricing: SiteContent['pricing']) {
	return planIds.map(id => {
		const plan = pricing.plans[id]
		const values = {
			minutes: plan.minutes.toLocaleString('en-US'),
			concurrentCalls: plan.concurrentCalls.toLocaleString('en-US'),
			phoneNumbers: plan.phoneNumbers.toLocaleString('en-US'),
			proName: pricing.plans.pro.name,
		}
		return {
			...plan, id,
			// Monthly displays are approximate; the annual charge is authoritative.
			annualMonthly: Math.floor(plan.annualTotal / 12),
			benefits: Object.keys(seed.pricing.plans[id].benefits).map(key =>
				fillTokens((plan.benefits as Record<string, string>)[key], values)),
		}
	})
}

export function getUsageRates(pricing: SiteContent['pricing']) {
	return { additionalPhoneNumberMonthly: pricing.additionalPhoneNumberMonthly }
}

// Compatibility defaults for pure tests. Public renderers use request-specific selectors.
export const PLANS = getPlans(seed.pricing)
export const USAGE_RATES = getUsageRates(seed.pricing)

export function formatPrice(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
		maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
	}).format(value)
}
