import { describe, expect, it } from 'vitest'
import seed from '../../../content/site/site.json'
import { getPlans, getUsageRates, formatPrice } from '../pricing'
import { validateSite } from '../tina/site-model'

describe('shared commercial settings', () => {
	it('validates the checked-in catalog', () => {
		expect(() => validateSite(seed)).not.toThrow()
	})
	it('uses stable IDs and derives approximate monthly prices from annual totals', () => {
		const plans = getPlans(seed.pricing)
		expect(plans.map(plan => plan.id)).toEqual(['basic', 'pro', 'plus', 'max'])
		for (const plan of plans) {
			expect(plan.annualMonthly).toBe(Math.floor(plan.annualTotal / 12))
			expect(plan.benefits.join(' ')).not.toMatch(/\{[^}]+\}/)
		}
		expect(getUsageRates(seed.pricing).additionalPhoneNumberMonthly).toBe(seed.pricing.additionalPhoneNumberMonthly)
	})
	it('refreshes allowance copy and editable plan names from the same source', () => {
		const pricing = structuredClone(seed.pricing)
		pricing.plans.basic.minutes = 3456
		pricing.plans.basic.benefits.item1 = '{minutes} minutes'
		pricing.plans.pro.name = 'Crew'
		pricing.plans.plus.benefits.item6 = 'Everything in {proName}'
		const plans = getPlans(pricing)
		expect(plans[0].benefits[0]).toBe('3,456 minutes')
		expect(plans[2].benefits[5]).toBe('Everything in Crew')
	})
	it('formats USD with thousands separators', () => {
		expect(formatPrice(1200)).toBe('$1,200')
		expect(formatPrice(299.5)).toBe('$299.50')
	})
	it('ignores Tina metadata when deriving fixed benefit slots', () => {
		const pricing = structuredClone(seed.pricing)
		Object.assign(pricing.plans.basic.benefits, { __typename: 'Benefits', _content_source: {} })
		expect(getPlans(pricing)[0].benefits).toEqual(getPlans(seed.pricing)[0].benefits)
	})
})
